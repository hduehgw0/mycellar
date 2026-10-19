import { afterAll, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";

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
