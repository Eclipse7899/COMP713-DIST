-- AlterTable
ALTER TABLE "UserShare" DROP CONSTRAINT "UserShare_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "UserShare_pkey" PRIMARY KEY ("userId", "sharedWithUserId");
