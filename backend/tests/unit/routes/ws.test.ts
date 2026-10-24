import { afterAll, beforeAll, describe, expect, it, vi } from 'bun:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { websocket } from '@hono/bun';
import type { WSContext } from 'hono/ws';
import { createWsRoute } from '../../../src/routes/ws';
import { getJwtMiddleware } from '../../../src/middleware/jwt.middleware';
import {
  RealtimeHub,
  type ServerEvent,
} from '../../../src/realtime/realtime-hub';
import type { WsTicketService } from '../../../src/services/ws-ticket.service';
import {
  foodItemDtoSchema,
  type WsTicketResponse,
  wsTicketResponseSchema,
} from '../../../src/schemas';

const JWT_SECRET = 'test-secret';
const OTHER_SECRET = 'another-secret';
const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

const issuedTicket = wsTicketResponseSchema.parse({ ticket: 'issued-ticket' });

const event: ServerEvent = {
  type: 'item.updated',
  data: foodItemDtoSchema.parse({
    id: 'item-1',
    foodId: 'food-1',
    quantity: 2,
    unit: 'ITEM',
    expiryDate: null,
    addedAt: new Date('2026-01-01'),
    food: {
      id: 'food-1',
      name: 'Apple',
      category: 'FRUIT',
      createdByUserId: USER_ID,
    },
  }),
};

function accessToken(sub: string, secret = JWT_SECRET) {
  return sign(
    {
      sub,
      email: `${sub}@example.com`,
      username: sub,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    secret,
  );
}

function fakeSocket() {
  return { send: vi.fn(), close: vi.fn() } as unknown as WSContext & {
    send: ReturnType<typeof vi.fn>;
  };
}

function subscriptions(hub: RealtimeHub) {
  return (hub as unknown as { userCallbacks: Map<string, Set<unknown>> })
    .userCallbacks;
}

function createService(
  overrides: {
    issue?: (userId: string) => Promise<WsTicketResponse>;
    consume?: (ticket: string) => Promise<string | undefined>;
  } = {},
) {
  return {
    issue: overrides.issue ?? vi.fn().mockResolvedValue(issuedTicket),
    consume: overrides.consume ?? vi.fn().mockResolvedValue(USER_ID),
  } as unknown as WsTicketService;
}

/**
 * `@hono/bun` resolves the Bun server from `c.env` (see `getBunServer`), so a
 * fake env with an `upgrade` spy lets the route be exercised without opening a
 * real socket. The spy captures the events the route would have registered.
 */
function createHarness(service: WsTicketService = createService()) {
  const realtime = new RealtimeHub();
  const app = new Hono()
    .use('/api/ws/ticket', getJwtMiddleware(JWT_SECRET))
    .route('/api/ws', createWsRoute(realtime, service));

  async function upgradeRequest(ticket?: string) {
    const upgrade = vi.fn((_request: Request, _options?: unknown) => true);
    // Hono's default error handler logs every rejected handshake; keep the
    // expected-error output out of the test report.
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      const url =
        ticket === undefined
          ? '/api/ws'
          : `/api/ws?ticket=${encodeURIComponent(ticket)}`;
      const response = await app.request(url, {}, { upgrade } as never);
      const data = upgrade.mock.calls[0]?.[1] as
        | { data: { events: { onOpen: Function; onClose: Function } } }
        | undefined;
      return { response, upgrade, events: data?.data.events };
    } finally {
      consoleError.mockRestore();
    }
  }

  return { app, realtime, service, upgradeRequest };
}

describe('GET /ws', () => {
  it('rejects a request without a ticket', async () => {
    const { upgradeRequest, service } = createHarness();
    const { response, upgrade } = await upgradeRequest();

    expect(upgrade).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(service.consume).not.toHaveBeenCalled();
  });

  it('rejects an unknown ticket', async () => {
    const consume = vi.fn().mockResolvedValue(undefined);
    const { upgradeRequest } = createHarness(createService({ consume }));
    const { response, upgrade } = await upgradeRequest('unknown-ticket');

    expect(upgrade).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(consume).toHaveBeenCalledWith('unknown-ticket');
  });

  it('rejects a normal access token passed as a ticket', async () => {
    const { upgradeRequest } = createHarness(
      createService({ consume: vi.fn().mockResolvedValue(undefined) }),
    );
    const { response, upgrade } = await upgradeRequest(
      await accessToken(USER_ID),
    );

    expect(upgrade).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('upgrades the connection for a valid ticket and registers open/close handlers', async () => {
    const consume = vi.fn().mockResolvedValue(USER_ID);
    const { upgradeRequest } = createHarness(createService({ consume }));
    const { response, upgrade, events } = await upgradeRequest('valid-ticket');

    expect(upgrade).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(consume).toHaveBeenCalledWith('valid-ticket');
    expect(events?.onOpen).toBeFunction();
    expect(events?.onClose).toBeFunction();
  });

  it('sends broadcast events to the connected socket as JSON', async () => {
    const { realtime, upgradeRequest } = createHarness();
    const { events } = await upgradeRequest('valid-ticket');
    const socket = fakeSocket();

    events!.onOpen(new Event('open'), socket);
    realtime.broadcast(USER_ID, event);

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it('does not send events belonging to another user', async () => {
    const { realtime, upgradeRequest } = createHarness();
    const { events } = await upgradeRequest('valid-ticket');
    const socket = fakeSocket();

    events!.onOpen(new Event('open'), socket);
    realtime.broadcast(OTHER_USER_ID, event);

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('delivers events to two sockets opened for the same user', async () => {
    const { realtime, upgradeRequest } = createHarness();
    const first = await upgradeRequest('first-ticket');
    const second = await upgradeRequest('second-ticket');
    const firstSocket = fakeSocket();
    const secondSocket = fakeSocket();

    first.events!.onOpen(new Event('open'), firstSocket);
    second.events!.onOpen(new Event('open'), secondSocket);
    realtime.broadcast(USER_ID, event);

    expect(firstSocket.send).toHaveBeenCalledWith(JSON.stringify(event));
    expect(secondSocket.send).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it('unsubscribes the socket when the connection closes', async () => {
    const { realtime, upgradeRequest } = createHarness();
    const { events } = await upgradeRequest('valid-ticket');
    const socket = fakeSocket();

    events!.onOpen(new Event('open'), socket);
    events!.onClose(new CloseEvent('close'), socket);
    realtime.broadcast(USER_ID, event);

    expect(socket.send).not.toHaveBeenCalled();
    expect(subscriptions(realtime).has(USER_ID)).toBe(false);
  });
});

describe('GET /ws/ticket', () => {
  it('rejects a request without an Authorization header', async () => {
    const { app } = createHarness();

    const response = await app.request('/api/ws/ticket');

    expect(response.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const { app } = createHarness();

    const response = await app.request('/api/ws/ticket', {
      headers: { Authorization: 'not-bearer' },
    });

    expect(response.status).toBe(401);
  });

  it('rejects an access token signed with another secret', async () => {
    const { app } = createHarness();

    const response = await app.request('/api/ws/ticket', {
      headers: {
        Authorization: `Bearer ${await accessToken(USER_ID, OTHER_SECRET)}`,
      },
    });

    expect(response.status).toBe(401);
  });

  it('returns the ticket issued by the service', async () => {
    const issue = vi.fn().mockResolvedValue(issuedTicket);
    const { app } = createHarness(createService({ issue }));

    const response = await app.request('/api/ws/ticket', {
      headers: { Authorization: `Bearer ${await accessToken(USER_ID)}` },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ticket: issuedTicket.ticket,
    });
    expect(issue).toHaveBeenCalledWith(USER_ID);
  });
});

describe('GET /ws over a real Bun server', () => {
  let server: ReturnType<typeof Bun.serve>;
  let realtime: RealtimeHub;

  beforeAll(() => {
    realtime = new RealtimeHub();
    const app = new Hono().route(
      '/api/ws',
      createWsRoute(
        realtime,
        createService({ consume: vi.fn().mockResolvedValue(USER_ID) }),
      ),
    );
    server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: (request, bunServer) => app.fetch(request, bunServer as never),
      websocket,
    });
  });

  afterAll(() => {
    server.stop(true);
  });

  it('opens a real socket and streams a broadcasted event', async () => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${server.port}/api/ws?ticket=valid-ticket`,
    );

    try {
      await new Promise<void>((resolve, reject) => {
        socket.onopen = () => resolve();
        socket.onerror = () => reject(new Error('websocket failed to open'));
        socket.onclose = () =>
          reject(new Error('websocket closed before opening'));
      });

      const message = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('timed out waiting for event')),
          2000,
        );
        socket.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(String(event.data));
        };
      });

      realtime.broadcast(USER_ID, event);

      await expect(message).resolves.toBe(JSON.stringify(event));
    } finally {
      socket.close();
    }
  });
});
