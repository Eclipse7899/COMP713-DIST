/*
  Warnings:

  - You are about to drop the column `addedAt` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Food` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Food" DROP CONSTRAINT "Food_userId_fkey";

-- DropIndex
DROP INDEX "Food_category_idx";

-- DropIndex
DROP INDEX "Food_expiryDate_idx";

-- DropIndex
DROP INDEX "Food_userId_idx";

-- AlterTable
ALTER TABLE "Food" DROP COLUMN "addedAt",
DROP
COLUMN "expiryDate",
DROP
COLUMN "quantity",
DROP
COLUMN "unit",
DROP
COLUMN "updatedAt",
DROP
COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdByUserId" TEXT;

-- CreateTable
CREATE TABLE "FoodItem"
(
    "id"         TEXT             NOT NULL,
    "userId"     TEXT             NOT NULL,
    "foodId"     TEXT             NOT NULL,
    "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit"       "FoodUnit"       NOT NULL DEFAULT 'ITEM',
    "expiryDate" TIMESTAMP(3),
    "addedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodItem_userId_idx" ON "FoodItem" ("userId");

-- CreateIndex
CREATE INDEX "FoodItem_expiryDate_idx" ON "FoodItem" ("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_userId_foodId_key" ON "FoodItem" ("userId", "foodId");

-- CreateIndex
CREATE INDEX "Food_createdByUserId_idx" ON "Food" ("createdByUserId");

-- AddForeignKey
ALTER TABLE "FoodItem"
    ADD CONSTRAINT "FoodItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem"
    ADD CONSTRAINT "FoodItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food"
    ADD CONSTRAINT "Food_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
