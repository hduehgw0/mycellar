import { describe, expect, it } from "vitest";

import { whiskyCreateSchema, whiskyUpdateSchema } from "./whisky";

describe("whiskyCreateSchema", () => {
  it("製品名だけで通り、既定値（本数1・限定版false）が入る", () => {
    const result = whiskyCreateSchema.parse({ name: "山崎" });
    expect(result).toEqual({ name: "山崎", quantity: 1, isLimited: false });
  });

  it("全項目を指定するとそのまま通る", () => {
    const input = {
      name: "ラフロイグ 10年",
      country: "スコットランド",
      region: "アイラ",
      age: 10,
      caskType: "バーボン樽",
      isLimited: true,
      quantity: 2,
      memo: "アイラらしい強いピートと潮の香り",
    };
    expect(whiskyCreateSchema.parse(input)).toEqual(input);
  });

  // 不可視文字だけの製品名は trim では消えないが、nameKey が空になる。
  it.each(["", "   ", "　", "\u200B", "\u00AD"])(
    "製品名が実質空（%j）なら通らない",
    (name) => {
      const result = whiskyCreateSchema.safeParse({ name });
      expect(result.success).toBe(false);
    },
  );

  it("固定リストにない国は通らない", () => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎",
      country: "月",
    });
    expect(result.success).toBe(false);
  });

  it.each([null, "日本"])("国が %j なら地域は通らない", (country) => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎",
      country,
      region: "アイラ",
    });
    expect(result.success).toBe(false);
  });

  it.each([0, 100])("年数 %d は通る（0〜100）", (age) => {
    const result = whiskyCreateSchema.safeParse({ name: "山崎", age });
    expect(result.success).toBe(true);
  });

  it.each([-1, 101, 1.5])("年数 %d は通らない（0〜100の整数）", (age) => {
    const result = whiskyCreateSchema.safeParse({ name: "山崎", age });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1.5])("本数 %d は通らない（1以上の整数）", (quantity) => {
    const result = whiskyCreateSchema.safeParse({ name: "山崎", quantity });
    expect(result.success).toBe(false);
  });

  it("メモの空文字は値なし（null）になる", () => {
    const result = whiskyCreateSchema.parse({ name: "山崎", memo: "" });
    expect(result.memo).toBeNull();
  });
});

describe("whiskyUpdateSchema", () => {
  it("送った項目だけが残り、既定値で埋めない", () => {
    expect(whiskyUpdateSchema.parse({ age: 12 })).toEqual({ age: 12 });
  });

  it("送った項目は登録と同じルールで検査する", () => {
    const result = whiskyUpdateSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it.each([{ country: "日本" }, { region: null }])(
    "国と地域の片方だけ（%j）は通らない",
    (input) => {
      const result = whiskyUpdateSchema.safeParse(input);
      expect(result.success).toBe(false);
    },
  );

  it("国と地域を組で送れば通る", () => {
    const input = { country: "日本", region: null };
    expect(whiskyUpdateSchema.parse(input)).toEqual(input);
  });

  it("組で送っても、国がスコットランドでなければ地域は通らない", () => {
    const result = whiskyUpdateSchema.safeParse({
      country: "日本",
      region: "アイラ",
    });
    expect(result.success).toBe(false);
  });

  it("本数 0 は通らない（1以上の整数）", () => {
    const result = whiskyUpdateSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });
});
