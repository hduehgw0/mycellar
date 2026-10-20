import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

import { assertTestDatabase } from "./test-database";

export default function setup(project: TestProject) {
  const url = project.config.env?.DATABASE_URL;
  assertTestDatabase(url);

  // prisma.config.ts は .env を読むが、すでにある環境変数は上書きしない。
  execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL_UNPOOLED: url },
    stdio: "inherit",
  });
}
