import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oAuthProxy } from "better-auth/plugins/oauth-proxy";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/env";

// Vercel が自動で入れる、このデプロイのホスト。
const vercel = process.env.VERCEL
  ? {
      productionHost: requireEnv("VERCEL_PROJECT_PRODUCTION_URL"),
      // Git から作ったデプロイにだけ入る
      branchHost: process.env.VERCEL_BRANCH_URL,
      deploymentHost: requireEnv("VERCEL_URL"),
    }
  : null;
const productionURL = vercel && `https://${vercel.productionHost}`;

export const auth = betterAuth({
  // Vercel は preview の URL が毎回変わるので、リクエストのホストから baseURL を作る。手元は BETTER_AUTH_URL。
  // allowedHosts は信頼する URL も兼ねる。ワイルドカードにすると、他人の vercel.app まで当てはまってしまう。
  // fallback が無いと、一覧に無いホストで開いたとき、ログイン状態を読むだけでも例外になる。
  baseURL: vercel
    ? {
        allowedHosts: [
          vercel.productionHost,
          vercel.branchHost,
          vercel.deploymentHost,
        ].filter((host) => host !== undefined),
        protocol: "https",
        fallback: `https://${vercel.deploymentHost}`,
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
  // 手元は localhost を Google に登録済みなので、プラグインを通さない。
  plugins: productionURL
    ? [
        oAuthProxy({
          productionURL,
          // 本番と preview で同じ値にする。BETTER_AUTH_SECRET は環境ごとに別のままにする。
          secret: requireEnv("OAUTH_PROXY_SECRET"),
        }),
      ]
    : [],
});
