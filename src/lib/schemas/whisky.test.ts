import { describe, expect, it } from "vitest";

import {
  whiskyCreateSchema,
  whiskyFormSchema,
  whiskyUpdateSchema,
} from "./whisky";

describe("whiskyCreateSchema", () => {
  it("製品名だけで通り、既定値（本数1・限定版false）が入る", () => {
    const result = whiskyCreateSchema.parse({ name: "山崎 12年" });
    expect(result).toEqual({
      name: "山崎 12年",
      quantity: 1,
      isLimited: false,
    });
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

  it("製品名は100文字まで", () => {
    const parse = (name: string) => whiskyCreateSchema.safeParse({ name });
    expect(parse("あ".repeat(100)).success).toBe(true);
    expect(parse("あ".repeat(101)).success).toBe(false);
  });

  it("固定リストにない国は通らない", () => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎 12年",
      country: "月",
    });
    expect(result.success).toBe(false);
  });

  it.each([null, "日本"])("国が %j なら地域は通らない", (country) => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎 12年",
      country,
      region: "アイラ",
    });
    expect(result.success).toBe(false);
  });

  it.each([0, 100])("年数 %d は通る（0〜100）", (age) => {
    const result = whiskyCreateSchema.safeParse({ name: "山崎 12年", age });
    expect(result.success).toBe(true);
  });

  it.each([-1, 101, 1.5])("年数 %d は通らない（0〜100の整数）", (age) => {
    const result = whiskyCreateSchema.safeParse({ name: "山崎 12年", age });
    expect(result.success).toBe(false);
  });

  it.each([1, 99])("本数 %d は通る（1〜99）", (quantity) => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎 12年",
      quantity,
    });
    expect(result.success).toBe(true);
  });

  it.each([0, 100, 1.5])("本数 %d は通らない（1〜99の整数）", (quantity) => {
    const result = whiskyCreateSchema.safeParse({
      name: "山崎 12年",
      quantity,
    });
    expect(result.success).toBe(false);
  });

  it("メモの空文字は値なし（null）になる", () => {
    const result = whiskyCreateSchema.parse({ name: "山崎 12年", memo: "" });
    expect(result.memo).toBeNull();
  });

  it("メモは500文字まで", () => {
    const parse = (memo: string) =>
      whiskyCreateSchema.safeParse({ name: "山崎 12年", memo });
    expect(parse("あ".repeat(500)).success).toBe(true);
    expect(parse("あ".repeat(501)).success).toBe(false);
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

  it("本数 0 は通らない（1〜99の整数）", () => {
    const result = whiskyUpdateSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });
});

describe("whiskyFormSchema", () => {
  // フォームが持つ値。任意の項目の空欄は null。
  const empty = {
    name: "山崎 12年",
    country: null,
    region: null,
    age: null,
    caskType: null,
    isLimited: false,
    quantity: 1,
    memo: null,
  };

  it("全項目がそろえば、空欄の null のまま通る", () => {
    expect(whiskyFormSchema.parse(empty)).toEqual(empty);
  });

  it.each(["country", "isLimited", "quantity"])(
    "項目（%s）が欠けていたら既定値で埋めずに通さない",
    (key) => {
      const missing: Partial<typeof empty> = { ...empty };
      delete missing[key as keyof typeof empty];
      expect(whiskyFormSchema.safeParse(missing).success).toBe(false);
    },
  );

  it("値は API と同じルールで検査する", () => {
    const result = whiskyFormSchema.safeParse({ ...empty, age: 101 });
    expect(result.success).toBe(false);
  });

  it("国がスコットランドでなければ地域は通らない", () => {
    const result = whiskyFormSchema.safeParse({
      ...empty,
      country: "日本",
      region: "アイラ",
    });
    expect(result.success).toBe(false);
  });

  it("メモの空文字は値なし（null）になる", () => {
    expect(whiskyFormSchema.parse({ ...empty, memo: "" }).memo).toBeNull();
  });
});
