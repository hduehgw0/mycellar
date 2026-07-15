import { afterEach, describe, expect, it } from "vitest";

import { requireEnv } from "./env";

describe("requireEnv", () => {
  const KEY = "TEST_REQUIRE_ENV";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("値が設定されていればそれを返す", () => {
    process.env[KEY] = "value";
    expect(requireEnv(KEY)).toBe("value");
  });

  it("未設定なら変数名付きで throw する", () => {
    delete process.env[KEY];
    expect(() => requireEnv(KEY)).toThrow(KEY);
  });
});
