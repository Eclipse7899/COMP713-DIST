import type { PrismaClient, WsTicket } from '../generated/prisma/client';

export interface WsTicketRepository {
  create(data: {
    ticket: string;
    userId: string;
    expiresAt: Date;
  }): Promise<WsTicket>;
  consume(ticket: string, now: Date): Promise<string | undefined>;
  deleteExpiredAndUsed(now: Date): Promise<number>;
}

export class WsTicketRepo implements WsTicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    ticket: string;
    userId: string;
    expiresAt: Date;
  }): Promise<WsTicket> {
    return this.prisma.wsTicket.create({ data });
  }

  /**
   * Atomically marks the ticket as used and returns its owner. The `usedAt:
   * null` predicate is what makes a ticket single-use: two concurrent
   * handshakes can match the row, but only the first update returns it.
   */
  async consume(ticket: string, now: Date): Promise<string | undefined> {
    const consumed = await this.prisma.wsTicket.updateManyAndReturn({
      where: {
        ticket,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    return consumed[0]?.userId;
  }

  async deleteExpiredAndUsed(now: Date): Promise<number> {
    const { count } = await this.prisma.wsTicket.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
      },
    });
    return count;
  }
}
