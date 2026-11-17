import { describe, expect, it } from "vitest";

import { ageLabel } from "./age-label";

describe("ageLabel", () => {
  it("年数があれば「◯年」", () => {
    expect(ageLabel({ age: 12, isNas: false })).toBe("12年");
  });

  it("NAS と確認済みなら「NAS」", () => {
    expect(ageLabel({ age: null, isNas: true })).toBe("NAS");
  });

  it("未確認なら何も出さない", () => {
    expect(ageLabel({ age: null, isNas: false })).toBeNull();
  });
});
