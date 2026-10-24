import { randomBytes } from 'node:crypto';
import type { WsTicketRepository } from '../repositories/ws-ticket.repo';
import { type WsTicketResponse, wsTicketResponseSchema } from '../schemas';

/** How long an issued ticket may wait before the client opens the socket. */
export const WS_TICKET_TTL_MS = 30_000;

export class WsTicketService {
  constructor(
    private readonly tickets: WsTicketRepository,
    private readonly ttlMs: number = WS_TICKET_TTL_MS,
  ) {}

  async issue(userId: string): Promise<WsTicketResponse> {
    const now = new Date();
    // Keep the table bounded without a background job: expired and already
    // consumed tickets have no value once a new one is requested.
    await this.tickets.deleteExpiredAndUsed(now);

    const ticket = randomBytes(32).toString('base64url');
    await this.tickets.create({
      ticket,
      userId,
      expiresAt: new Date(now.getTime() + this.ttlMs),
    });

    return wsTicketResponseSchema.parse({ ticket });
  }

  async consume(ticket: string): Promise<string | undefined> {
    return this.tickets.consume(ticket, new Date());
  }
}
