import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Neon は眠らせた DB を起こすのにたまに 4〜5 秒かかり、CLI の既定の 5 秒では
// 待ちきれずにビルドの migrate deploy が落ちる（→ #188）。
function withConnectTimeout(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=15`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI（migrate 等）専用の接続。スキーマ変更は PgBouncer（pooled）経由では
    // 動かないため direct（-pooler なし）を使う。
    // アプリ実行時の接続は pooled（DATABASE_URL）をクライアント初期化側で指定する。
    // env() は未設定時に変数名付きで即 throw する（fail-fast）。
    url: withConnectTimeout(env("DATABASE_URL_UNPOOLED")),
  },
});
