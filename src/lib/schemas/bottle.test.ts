import { describe, expect, it } from "vitest";

import { IDENTITY_KEY_SEPARATOR as SEP } from "@/lib/bottle-identity";

import { bottleSchema } from "./bottle";

describe("bottleSchema", () => {
  it("銘柄名だけで通り、既定値（本数1・限定版false）が入る", () => {
    const result = bottleSchema.parse({ name: "山崎" });
    expect(result).toEqual({ name: "山崎", quantity: 1, isLimited: false });
  });

  it("全項目を指定するとそのまま通る", () => {
    const input = {
      name: "ラフロイグ 10年",
      region: "スコットランド",
      subRegion: "アイラ",
      age: 10,
      caskType: "バーボン樽",
      isLimited: true,
      quantity: 2,
      note: "父の誕生日に開封",
    };
    expect(bottleSchema.parse(input)).toEqual(input);
  });

  // 不可視文字だけの銘柄名は trim も min(1) も通り抜けるが、正規化すると空になる。
  it.each(["", "   ", "　", "​", "­"])(
    "銘柄名が実質空（%j）なら通らない",
    (name) => {
      const result = bottleSchema.safeParse({ name });
      expect(result.success).toBe(false);
    },
  );

  it("固定リストにない産地は通らない", () => {
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

  // 判定キーの区切り文字。混ざると別の組み合わせと同じキーになりうる。
  it.each(["name", "caskType"] as const)(
    "判定キーに入る %s に区切り文字が混ざると通らない",
    (field) => {
      const result = bottleSchema.safeParse({
        name: "山崎",
        [field]: `山崎${SEP}12`,
      });
      expect(result.success).toBe(false);
    },
  );

  // キーに入らない項目まで弾くと、正当な入力（例：メモ）を落とすだけになる。
  it.each(["subRegion", "note"] as const)(
    "判定キーに入らない %s は区切り文字を含んでも通る",
    (field) => {
      const result = bottleSchema.safeParse({
        name: "山崎",
        [field]: `a${SEP}b`,
      });
      expect(result.success).toBe(true);
    },
  );
});
