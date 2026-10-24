-- CreateTable
CREATE TABLE "WsTicket" (
    "ticket" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WsTicket_pkey" PRIMARY KEY ("ticket")
);

-- CreateIndex
CREATE INDEX "WsTicket_userId_idx" ON "WsTicket"("userId");

-- CreateIndex
CREATE INDEX "WsTicket_expiresAt_idx" ON "WsTicket"("expiresAt");

-- AddForeignKey
ALTER TABLE "WsTicket" ADD CONSTRAINT "WsTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
