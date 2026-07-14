import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/env";

export const auth = betterAuth({
  // ローカルは BETTER_AUTH_URL（http://localhost:3000）を必須にして fail-fast。
  // Vercel（本番・Preview とも *.vercel.app）はリクエストのホストから baseURL を導出する。
  // これにより Preview（BETTER_AUTH_URL 未設定・動的 URL）でもビルド・描画が通る（→ Dynamic Base URL）。
  // ※ Preview での Google ログイン自体は callback を Google に登録できず不可（確認はローカル/本番）。
  baseURL: process.env.VERCEL
    ? { allowedHosts: ["*.vercel.app"], protocol: "https" }
    : requireEnv("BETTER_AUTH_URL"),
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
