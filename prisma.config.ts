import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI（migrate 等）専用の接続。スキーマ変更は PgBouncer（pooled）経由では
    // 動かないため direct（-pooler なし）を使う。
    // アプリ実行時の接続は pooled（DATABASE_URL）をクライアント初期化側で指定する。
    url: process.env["DATABASE_URL_UNPOOLED"],
  },
});
