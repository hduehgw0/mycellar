import { describe, expect, it } from "vitest";

import { toNameKey } from "./name-key";

describe("toNameKey", () => {
  it("全角と半角を同じにする（NFKC）", () => {
    expect(toNameKey("ＭＡＣＡＬＬＡＮ")).toBe(toNameKey("MACALLAN"));
    expect(toNameKey("ｱｲﾗ")).toBe(toNameKey("アイラ"));
  });

  it("大文字と小文字を同じにする", () => {
    expect(toNameKey("Macallan")).toBe(toNameKey("macallan"));
  });

  it("内部の空白も含めて全て取り除く", () => {
    expect(toNameKey(" 山崎 12 年 ")).toBe("山崎12年");
    expect(toNameKey("山崎　12年")).toBe("山崎12年");
  });

  it("空文字はそのまま空文字", () => {
    expect(toNameKey("")).toBe("");
  });

  // Web や PDF からのコピペで混入する。残すと見た目が同じ 2 つの製品を別物として登録できる。
  it.each([
    ["ZWSP", "\u200B"],
    ["ソフトハイフン", "\u00AD"],
    ["ZWNJ", "\u200C"],
    ["BOM", "\uFEFF"],
    ["異体字セレクタ", "\uFE00"],
  ])("幅を持たない %s を取り除く", (_name, invisible) => {
    expect(toNameKey(`山崎 12年${invisible}`)).toBe("山崎12年");
  });

  // 小文字化を先にすると NFKC が後から大文字を作って残る。
  it("NFKC を小文字化より先に掛ける", () => {
    expect(toNameKey("ᴬ")).toBe("a");
  });
});
