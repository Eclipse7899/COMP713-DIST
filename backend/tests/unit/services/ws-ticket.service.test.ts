import { afterEach, describe, expect, it, setSystemTime, vi } from "bun:test";
import type { WsTicketRepository } from "../../../src/repositories/ws-ticket.repo";
import {
  WS_TICKET_TTL_MS,
  WsTicketService,
} from "../../../src/services/ws-ticket.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const USER_ID = "user-1";

function createRepo(overrides: Partial<WsTicketRepository> = {}) {
  return {
    create: vi.fn().mockResolvedValue({}),
    consume: vi.fn().mockResolvedValue(USER_ID),
    deleteExpiredAndUsed: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as WsTicketRepository;
}

afterEach(() => {
  setSystemTime();
});

describe("WsTicketService", () => {
  it("issues an opaque, URL-safe ticket", async () => {
    setSystemTime(NOW);
    const service = new WsTicketService(createRepo());

    const { ticket } = await service.issue(USER_ID);

    expect(ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("issues a different ticket every time", async () => {
    const service = new WsTicketService(createRepo());

    const first = await service.issue(USER_ID);
    const second = await service.issue(USER_ID);

    expect(first.ticket).not.toBe(second.ticket);
  });

  it("stores the ticket for the user until the default lifetime elapses", async () => {
    setSystemTime(NOW);
    const create = vi.fn().mockResolvedValue({});
    const service = new WsTicketService(createRepo({ create }));

    const { ticket } = await service.issue(USER_ID);

    expect(create).toHaveBeenCalledWith({
      ticket,
      userId: USER_ID,
      expiresAt: new Date(NOW.getTime() + WS_TICKET_TTL_MS),
    });
  });

  it("honours a custom lifetime", async () => {
    setSystemTime(NOW);
    const create = vi.fn().mockResolvedValue({});
    const service = new WsTicketService(createRepo({ create }), 1_000);

    await service.issue(USER_ID);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: new Date(NOW.getTime() + 1_000),
      }),
    );
  });

  it("returns the user id when a ticket is consumed", async () => {
    setSystemTime(NOW);
    const consume = vi.fn().mockResolvedValue(USER_ID);
    const service = new WsTicketService(createRepo({ consume }));

    await expect(service.consume("a-ticket")).resolves.toBe(USER_ID);
    expect(consume).toHaveBeenCalledWith("a-ticket", NOW);
  });

  it("returns undefined for an unknown or already used ticket", async () => {
    const service = new WsTicketService(
      createRepo({ consume: vi.fn().mockResolvedValue(undefined) }),
    );

    await expect(service.consume("unknown")).resolves.toBeUndefined();
  });
});
