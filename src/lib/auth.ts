import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oAuthProxy } from "better-auth/plugins/oauth-proxy";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/env";

export const auth = betterAuth({
  // ローカルは BETTER_AUTH_URL（http://localhost:3000）を必須にして fail-fast。
  // Vercel（本番・Preview とも *.vercel.app）はリクエストのホストから baseURL を導出する。
  // これにより Preview（BETTER_AUTH_URL 未設定・動的 URL）でもビルド・描画が通る（→ Dynamic Base URL）。
  // allowedHosts は信頼する URL にもなる。preview の URL を外すと、OAuth Proxy がログインを preview に戻せない。
  // *.vercel.app にすると、他人のアプリもログイン後の戻り先として通ってしまう。
  // ここに無い URL で開くと、ログインの処理がエラーになる（独自ドメインを付けたら足す）。
  baseURL: process.env.VERCEL
    ? {
        allowedHosts: [
          "mycellar-iota.vercel.app",
          "mycellar-hduehgw0s-projects.vercel.app",
          "mycellar-*-hduehgw0s-projects.vercel.app",
        ],
        protocol: "https",
      }
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
  // preview の URL は毎回変わり Google に登録できないので、Google からの戻りは本番で受けて preview に渡す。
  // 手元は localhost を Google に登録済みなので通さない（通すと、手元のログインも本番を経由する）。
  plugins: process.env.VERCEL
    ? [
        oAuthProxy({
          productionURL: `https://${requireEnv("VERCEL_PROJECT_PRODUCTION_URL")}`,
          // 本番と preview で同じ値にする。BETTER_AUTH_SECRET は環境ごとに別のままにする。
          secret: requireEnv("OAUTH_PROXY_SECRET"),
        }),
      ]
    : [],
});
