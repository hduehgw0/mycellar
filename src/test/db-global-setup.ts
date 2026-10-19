import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

// DB のテストは表を空にするので、テスト用の DB 以外につながっていたら始めない。
function assertTestDatabase(url: string | undefined) {
  const { hostname, pathname } = new URL(url ?? "");
  if (hostname !== "localhost" || pathname !== "/mycellar_test") {
    throw new Error(
      `テスト用の DB ではないため、DB のテストを止めました：${hostname}${pathname}`,
    );
  }
}

export default function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  assertTestDatabase(url);

  // prisma.config.ts は .env を読むが、すでにある環境変数は上書きしない。
  execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL_UNPOOLED: url },
    stdio: "inherit",
  });
}
