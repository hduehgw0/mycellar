import { afterAll, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";

import { assertTestDatabase } from "./test-database";

// 表を空にするのは、Prisma が実際につなぐ DATABASE_URL なので、マイグレーションの前とは別にここでも確かめる。
assertTestDatabase(process.env.DATABASE_URL);

beforeEach(async () => {
  // _prisma_migrations を空にすると、次の migrate deploy が適用済みのマイグレーションを流し直して失敗する。
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map(({ tablename }) => `"${tablename}"`).join(", ")} CASCADE`,
  );
});

afterAll(() => prisma.$disconnect());
