import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  vi,
} from 'bun:test';
import { websocket } from '@hono/bun';
import { sign } from 'hono/jwt';
import { createApp } from '../../src/app';
import type { JwtFields } from '../../src/variables';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaClient as AuthPrismaClient } from '../../../auth-service/src/generated/prisma/client';
import { setup, teardown } from '../setup';
import { PrismaPg } from '@prisma/adapter-pg';
import { FoodCategory, FoodUnit } from '../../src/generated/prisma/enums';

jest.setTimeout(60000);

let app: ReturnType<typeof createApp>['app'];
let db: PrismaClient;
let authDb: AuthPrismaClient;
let server: ReturnType<typeof Bun.serve>;
const jwtSecret = 'test-secret';
const authPort = 5051;
const openSockets: WebSocket[] = [];

async function createTestUser(username: string, email: string) {
  const user = await authDb.user.create({
    data: {
      username,
      email,
      hashed_password: 'hashedpassword',
    },
  });
  await db.user.create({ data: { id: user.id } });

  const payload: JwtFields = {
    sub: user.id,
    email: user.email,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };

  const token = await sign(payload, jwtSecret);
  return { user, token };
}

function wsUrl(ticket: string) {
  return `ws://127.0.0.1:${server.port}/api/ws?ticket=${encodeURIComponent(ticket)}`;
}

function httpUrl(path: string) {
  return `http://127.0.0.1:${server.port}${path}`;
}

/**
 * Buffers incoming frames so a fast broadcast is not missed while the test is
 * still awaiting an HTTP response.
 */
class MessageQueue {
  private readonly queue: unknown[] = [];
  private readonly waiters: Array<{
    resolve: (value: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(ws: WebSocket) {
    ws.onmessage = (event) => {
      const value = JSON.parse(String(event.data));
      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(value);
      } else {
        this.queue.push(value);
      }
    };
  }

  next(timeoutMs = 2000): Promise<unknown> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift());
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex(
          (waiter) => waiter.timer === timer,
        );
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(new Error('timed out waiting for a realtime event'));
      }, timeoutMs);
      this.waiters.push({ resolve, timer });
    });
  }
}

async function connect(ticket: string) {
  const ws = new WebSocket(wsUrl(ticket));
  openSockets.push(ws);

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error('websocket failed to open'));
    ws.onclose = () => reject(new Error('websocket closed before opening'));
  });

  return { ws, messages: new MessageQueue(ws) };
}

function accessToken(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function jsonRequest(token: string, body: unknown) {
  return {
    method: 'POST',
    headers: {
      ...accessToken(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

async function issueTicket(accessTokenJwt: string) {
  const response = await app.request('/api/ws/ticket', {
    headers: accessToken(accessTokenJwt),
  });
  const body = (await response.json()) as { ticket: string };
  return { response, body };
}

beforeAll(async () => {
  const { backendDatabaseUrl, authDatabaseUrl, auth } = await setup(
    jwtSecret,
    authPort,
  );
  db = new PrismaClient({
    adapter: new PrismaPg(backendDatabaseUrl),
  });
  authDb = new AuthPrismaClient({
    adapter: new PrismaPg(authDatabaseUrl),
  });
  app = createApp(jwtSecret, auth, db).app;
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch: (request, bunServer) => app.fetch(request, bunServer as never),
    websocket,
  });
});

afterEach(() => {
  for (const ws of openSockets) {
    ws.close();
  }
  openSockets.length = 0;
});

afterAll(async () => {
  server.stop(true);
  await teardown();
});

beforeEach(async () => {
  await db.wsTicket.deleteMany();
  await db.userShare.deleteMany();
  await db.foodItem.deleteMany();
  await db.food.deleteMany();
  await db.user.deleteMany();
  await authDb.user.deleteMany();
});

describe('GET /api/ws/ticket', () => {
  it('rejects a request without an Authorization header', async () => {
    const response = await app.request('/api/ws/ticket');

    expect(response.status).toBe(401);
  });

  it('rejects an access token signed with another secret', async () => {
    const { user } = await createTestUser('wsticket1', 'wsticket1@example.com');
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      'another-secret',
    );

    const response = await app.request('/api/ws/ticket', {
      headers: accessToken(token),
    });

    expect(response.status).toBe(401);
  });

  it('issues an opaque ticket tied to the authenticated user', async () => {
    const { user, token } = await createTestUser(
      'wsticket2',
      'wsticket2@example.com',
    );

    const { response, body } = await issueTicket(token);

    expect(response.status).toBe(200);
    expect(body.ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // A ticket is opaque, not a JWT that could be replayed like an access token.
    expect(body.ticket).not.toContain('.');

    const stored = await db.wsTicket.findUnique({
      where: { ticket: body.ticket },
    });
    expect(stored?.userId).toBe(user.id);
    expect(stored?.usedAt).toBeNull();

    const lifetime = stored!.expiresAt.getTime() - Date.now();
    expect(lifetime).toBeGreaterThan(25_000);
    expect(lifetime).toBeLessThanOrEqual(30_000);
  });

  it('issues a different ticket every time', async () => {
    const { token } = await createTestUser(
      'wsticket3',
      'wsticket3@example.com',
    );

    const first = await issueTicket(token);
    const second = await issueTicket(token);

    expect(first.body.ticket).not.toBe(second.body.ticket);
  });

  it('rejects a ticket used as a bearer access token', async () => {
    const { token } = await createTestUser(
      'wsticket4',
      'wsticket4@example.com',
    );
    const { body } = await issueTicket(token);

    const response = await app.request('/api/food', {
      headers: accessToken(body.ticket),
    });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/ws', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Bun reports failed handshakes through console.error.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns 400 for a handshake without a ticket', async () => {
    const response = await fetch(httpUrl('/api/ws'));

    expect(response.status).toBe(400);
  });

  it('returns 401 for an unknown ticket', async () => {
    const response = await fetch(httpUrl('/api/ws?ticket=not-a-ticket'));

    expect(response.status).toBe(401);
  });

  it('rejects an unknown ticket', async () => {
    await expect(connect('not-a-ticket')).rejects.toThrow();
  });

  it('rejects a normal access token passed as a ticket', async () => {
    const { token } = await createTestUser('wshs1', 'wshs1@example.com');

    await expect(connect(token)).rejects.toThrow();
  });

  it('rejects an expired ticket', async () => {
    const { user } = await createTestUser('wshs2', 'wshs2@example.com');
    await db.wsTicket.create({
      data: {
        ticket: 'expired-ticket',
        userId: user.id,
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    const response = await fetch(httpUrl('/api/ws?ticket=expired-ticket'));

    expect(response.status).toBe(401);
  });

  it('rejects a ticket that has already been used', async () => {
    const { token } = await createTestUser('wshs4', 'wshs4@example.com');
    const { body } = await issueTicket(token);
    const first = await connect(body.ticket);

    first.ws.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    await expect(connect(body.ticket)).rejects.toThrow();
  });
});

describe('Realtime events', () => {
  it('streams food and item lifecycle events to the owner', async () => {
    const { user, token } = await createTestUser(
      'wsowner',
      'wsowner@example.com',
    );
    const { body: ticket } = await issueTicket(token);
    const { messages } = await connect(ticket.ticket);

    const foodResponse = await app.request(
      '/api/food',
      jsonRequest(token, { name: 'Apple', category: FoodCategory.FRUIT }),
    );
    expect(foodResponse.status).toBe(201);
    const food = (await foodResponse.json()) as { id: string };

    await expect(messages.next()).resolves.toMatchObject({
      type: 'food.created',
      data: { id: food.id, name: 'Apple', category: FoodCategory.FRUIT },
    });

    const itemResponse = await app.request(
      `/api/items/${user.id}`,
      jsonRequest(token, {
        foodId: food.id,
        quantity: 2,
        unit: FoodUnit.ITEM,
        expiryDate: null,
      }),
    );
    expect(itemResponse.status).toBe(201);
    const item = (await itemResponse.json()) as { data: { id: string } };

    await expect(messages.next()).resolves.toMatchObject({
      type: 'item.created',
      data: { id: item.data.id, foodId: food.id, quantity: 2 },
    });

    const updateResponse = await app.request(
      `/api/items/${user.id}/${item.data.id}`,
      {
        method: 'PUT',
        headers: {
          ...accessToken(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food.id,
          quantity: 5,
          unit: FoodUnit.ITEM,
          expiryDate: null,
        }),
      },
    );
    expect(updateResponse.status).toBe(200);

    await expect(messages.next()).resolves.toMatchObject({
      type: 'item.updated',
      data: { id: item.data.id, quantity: 5 },
    });

    const deleteItemResponse = await app.request(
      `/api/items/${user.id}/${item.data.id}`,
      { method: 'DELETE', headers: accessToken(token) },
    );
    expect(deleteItemResponse.status).toBe(200);

    await expect(messages.next()).resolves.toMatchObject({
      type: 'item.deleted',
      data: { id: item.data.id },
    });

    const deleteFoodResponse = await app.request(`/api/food/${food.id}`, {
      method: 'DELETE',
      headers: accessToken(token),
    });
    expect(deleteFoodResponse.status).toBe(204);

    await expect(messages.next()).resolves.toMatchObject({
      type: 'food.deleted',
      data: { id: food.id },
    });
  });

  it('delivers an event to every socket opened by the same user', async () => {
    const { token } = await createTestUser('wsmulti', 'wsmulti@example.com');
    const firstTicket = await issueTicket(token);
    const secondTicket = await issueTicket(token);
    const first = await connect(firstTicket.body.ticket);
    const second = await connect(secondTicket.body.ticket);

    await app.request(
      '/api/food',
      jsonRequest(token, { name: 'Pear', category: FoodCategory.FRUIT }),
    );

    await expect(first.messages.next()).resolves.toMatchObject({
      type: 'food.created',
      data: { name: 'Pear' },
    });
    await expect(second.messages.next()).resolves.toMatchObject({
      type: 'food.created',
      data: { name: 'Pear' },
    });
  });

  it('does not deliver another user’s events', async () => {
    const { token: ownerToken } = await createTestUser(
      'wsowner2',
      'wsowner2@example.com',
    );
    const { token: otherToken } = await createTestUser(
      'wsother',
      'wsother@example.com',
    );
    const { body: ownerTicket } = await issueTicket(ownerToken);
    const { body: otherTicket } = await issueTicket(otherToken);
    const owner = await connect(ownerTicket.ticket);
    const other = await connect(otherTicket.ticket);

    await app.request(
      '/api/food',
      jsonRequest(ownerToken, {
        name: 'Banana',
        category: FoodCategory.FRUIT,
      }),
    );

    await expect(owner.messages.next()).resolves.toMatchObject({
      type: 'food.created',
      data: { name: 'Banana' },
    });
    await expect(other.messages.next(500)).rejects.toThrow(
      'timed out waiting for a realtime event',
    );
  });

  it('notifies the user an inventory is shared with', async () => {
    const { user: owner, token: ownerToken } = await createTestUser(
      'wsshareowner',
      'wsshareowner@example.com',
    );
    const { user: recipient, token: recipientToken } = await createTestUser(
      'wssharerecipient',
      'wssharerecipient@example.com',
    );
    const { body: recipientTicket } = await issueTicket(recipientToken);
    const recipientSocket = await connect(recipientTicket.ticket);

    const shareResponse = await app.request(
      `/api/items/${owner.id}/shared`,
      jsonRequest(ownerToken, { sharedWithEmail: recipient.email }),
    );
    expect(shareResponse.status).toBe(201);

    await expect(recipientSocket.messages.next()).resolves.toMatchObject({
      type: 'share.created',
      data: {
        userId: owner.id,
        username: owner.username,
        sharedAt: expect.any(String),
      },
    });
  });

  it('notifies the user when an inventory is no longer shared with them', async () => {
    const { user: owner, token: ownerToken } = await createTestUser(
      'wsunshareowner',
      'wsunshareowner@example.com',
    );
    const { user: recipient, token: recipientToken } = await createTestUser(
      'wsunsharerecipient',
      'wsunsharerecipient@example.com',
    );

    const shareResponse = await app.request(
      `/api/items/${owner.id}/shared`,
      jsonRequest(ownerToken, { sharedWithEmail: recipient.email }),
    );
    expect(shareResponse.status).toBe(201);

    const { body: recipientTicket } = await issueTicket(recipientToken);
    const recipientSocket = await connect(recipientTicket.ticket);

    const unshareResponse = await app.request(
      `/api/items/${owner.id}/shared/${recipient.id}`,
      { method: 'DELETE', headers: accessToken(ownerToken) },
    );
    expect(unshareResponse.status).toBe(200);

    await expect(recipientSocket.messages.next()).resolves.toEqual({
      type: 'share.deleted',
      data: { userId: owner.id },
    });
  });
});
