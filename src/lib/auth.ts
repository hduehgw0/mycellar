import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/env";

export const auth = betterAuth({
  baseURL: requireEnv("BETTER_AUTH_URL"),
  // Better Auth は BETTER_AUTH_SECRET を暗黙 read するが、明示指定して未設定を fail-fast させる。
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    },
  },
  session: {
    // DB セッションだが、cookie キャッシュで毎リクエストの DB リードを減らす（→ ADR-0010）。
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
});
