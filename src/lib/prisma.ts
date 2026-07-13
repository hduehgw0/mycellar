import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// アプリ実行時は pooled 接続（DATABASE_URL）を使う。
// マイグレーションだけは direct を使う（prisma.config.ts / DATABASE_URL_UNPOOLED）。
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// dev のホットリロードで接続が増殖しないよう global にキャッシュする。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
