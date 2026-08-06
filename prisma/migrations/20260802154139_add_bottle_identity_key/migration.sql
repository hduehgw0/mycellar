-- AlterTable
ALTER TABLE "bottle" ADD COLUMN     "identityKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bottle_userId_identityKey_key" ON "bottle"("userId", "identityKey");

