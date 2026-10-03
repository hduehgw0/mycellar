-- DropForeignKey
ALTER TABLE "bottle" DROP CONSTRAINT "bottle_userId_fkey";

-- DropTable
DROP TABLE "bottle";

-- CreateTable
CREATE TABLE "whisky" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "age" INTEGER,
    "caskType" TEXT,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whisky_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bottle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whiskyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_bottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whisky_userId_nameKey_key" ON "whisky"("userId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "whisky_id_userId_key" ON "whisky"("id", "userId");

-- CreateIndex
CREATE INDEX "user_bottle_userId_whiskyId_idx" ON "user_bottle"("userId", "whiskyId");

-- AddForeignKey
ALTER TABLE "whisky" ADD CONSTRAINT "whisky_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bottle" ADD CONSTRAINT "user_bottle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bottle" ADD CONSTRAINT "user_bottle_whiskyId_userId_fkey" FOREIGN KEY ("whiskyId", "userId") REFERENCES "whisky"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

