import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// compose.yaml と CI の services で立てる DB。.env の DB（Neon）には向けない。
const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5433/mycellar_test";

export default defineConfig({
  resolve: {
    // tsconfig の paths（@/* → src/*）を Vitest でも解決する。
    alias: { "@": path.resolve(import.meta.dirname, "src") },
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
