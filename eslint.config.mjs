import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // DB に触る場所を絞る（→ ADR-0023）。
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/features/**/queries.ts",
      "src/features/**/mutations.ts",
      "src/lib/prisma.ts",
      "src/lib/auth.ts",
      "src/test/**",
      "src/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(@|\\.{1,2})/(.*/)?prisma(/|$)",
              allowTypeImports: true,
              message:
                "DB に触るのは features/<機能>/queries.ts・mutations.ts だけ。",
            },
          ],
        },
      ],
    },
  },
  // 機能どうしも、機能の中も、import を循環させない（→ ADR-0024）。
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "import/no-cycle": "error" },
    // node_modules の中まで解析すると、lint が 10 倍ほど遅くなる。
    // 外のパッケージがこのリポジトリのコードを import することはないので、循環の検出には要らない。
    settings: { "import/ignore": ["node_modules"] },
  },
  // 整形系ルールを無効化し Prettier に委ねる（必ず最後に置く）
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
