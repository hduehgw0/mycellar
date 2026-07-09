import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI（migrate 等）専用の接続。スキーマ変更は PgBouncer（pooled）経由では
    // 動かないため direct（-pooler なし）を使う。
    // アプリ実行時の接続は pooled（DATABASE_URL）をクライアント初期化側で指定する。
    // env() は未設定時に変数名付きで即 throw する（fail-fast）。
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
