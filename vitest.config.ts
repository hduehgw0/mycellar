import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// compose.test.yaml で立てる DB（手元も CI も）。.env の DB には向けない。
const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5433/mycellar_test";

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig の paths（@/* → src/*）を Vitest でも解決する。
      "@": path.resolve(import.meta.dirname, "src"),
      // server-only は Next.js のサーバ側の外で import すると例外を投げる。
      // テストはサーバ側のコードとして走らせるので、中身の無い版に差し替える。
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["**/*.db.test.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL },
          globalSetup: "src/test/db-global-setup.ts",
          setupFiles: "src/test/db-setup.ts",
          // テストごとに同じ DB の表を空にするので、ファイルを並べて走らせない。
          fileParallelism: false,
        },
      },
    ],
  },
});
