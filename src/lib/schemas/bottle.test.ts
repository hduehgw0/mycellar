import { describe, expect, it } from "vitest";

import { bottleSchema } from "./bottle";

describe("bottleSchema", () => {
  it("銘柄名だけで通り、既定値（本数1・限定版false）が入る", () => {
    const result = bottleSchema.parse({ name: "山崎" });
    expect(result).toEqual({ name: "山崎", quantity: 1, isLimited: false });
  });

  it("全項目を指定して通る", () => {
    const result = bottleSchema.parse({
      name: "ラフロイグ 10年",
      region: "スコットランド",
      subRegion: "アイラ",
      age: 10,
      caskType: "バーボン樽",
      isLimited: true,
      quantity: 2,
      note: "父の誕生日に開封",
    });
    expect(result.region).toBe("スコットランド");
    expect(result.quantity).toBe(2);
  });

  it.each(["", "   "])("銘柄名が空（%j）なら通らない", (name) => {
    const result = bottleSchema.safeParse({ name });
    expect(result.success).toBe(false);
  });

  it("固定リストにない国は通らない", () => {
    const result = bottleSchema.safeParse({ name: "山崎", region: "月" });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1.5])("本数 %d は通らない（1以上の整数）", (quantity) => {
    const result = bottleSchema.safeParse({ name: "山崎", quantity });
    expect(result.success).toBe(false);
  });

  it("年数は未指定でも通る（NAS）", () => {
    const result = bottleSchema.parse({ name: "山崎" });
    expect(result.age).toBeUndefined();
  });

  it("任意テキストの空文字は未入力（undefined）に正規化される", () => {
    const result = bottleSchema.parse({
      name: "山崎",
      subRegion: "",
      note: "",
    });
    expect(result.subRegion).toBeUndefined();
    expect(result.note).toBeUndefined();
  });
});
