-- Bottle テーブルを小文字 "bottle" へ非破壊リネームする（データを保持）。
-- 制約・インデックス名も Prisma が期待する新名称（bottle_*）へ揃え、drift を防ぐ。
ALTER TABLE "Bottle" RENAME TO "bottle";
ALTER TABLE "bottle" RENAME CONSTRAINT "Bottle_pkey" TO "bottle_pkey";
ALTER TABLE "bottle" RENAME CONSTRAINT "Bottle_userId_fkey" TO "bottle_userId_fkey";
ALTER INDEX "Bottle_userId_idx" RENAME TO "bottle_userId_idx";
