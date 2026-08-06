import { describe, expect, it } from "vitest";

import {
  IDENTITY_KEY_SEPARATOR as SEP,
  buildIdentityKey,
  normalizeText,
} from "./bottle-identity";

describe("normalizeText", () => {
  it("全角と半角を同じにする（NFKC）", () => {
    expect(normalizeText("ＭＡＣＡＬＬＡＮ")).toBe(normalizeText("MACALLAN"));
    expect(normalizeText("ｱｲﾗ")).toBe(normalizeText("アイラ"));
  });

  it("大文字と小文字を同じにする", () => {
    expect(normalizeText("Macallan")).toBe(normalizeText("macallan"));
  });

  it("内部の空白も含めて全て取り除く", () => {
    expect(normalizeText(" 山崎 12 年 ")).toBe("山崎12年");
    expect(normalizeText("山崎　12年")).toBe("山崎12年");
  });

  it("空文字はそのまま空文字", () => {
    expect(normalizeText("")).toBe("");
  });

  // Web や PDF からのコピペで混入する。残すと見た目が同じ 2 行を別物として登録できる。
  it.each([
    ["ZWSP", "​"],
    ["ソフトハイフン", "­"],
    ["ZWNJ", "‌"],
    ["BOM", "﻿"],
    ["異体字セレクタ", "︀"],
  ])("幅を持たない %s を取り除く", (_name, invisible) => {
    expect(normalizeText(`山崎${invisible}`)).toBe("山崎");
  });

  it("区切り文字は取り除かない（Cc なので不可視文字の対象外）", () => {
    expect(normalizeText(SEP)).toBe(SEP);
  });

  // 小文字化を先にすると NFKC が後から大文字を作って残る。
  it("NFKC を小文字化より先に掛ける", () => {
    expect(normalizeText("ᴬ")).toBe("a");
  });
});

describe("buildIdentityKey", () => {
  it("4 項目を区切り文字でつなぐ", () => {
    expect(
      buildIdentityKey({
        name: "山崎",
        age: 12,
        caskType: "シェリー",
        isLimited: true,
      }),
    ).toBe(["山崎", "12", "シェリー", "1"].join(SEP));
  });

  // 見た目が同じなら同じキーになる、が正規化の目的。
  it("不可視文字が混ざっても同じキーになる", () => {
    expect(buildIdentityKey({ name: "山崎​", age: 12 })).toBe(
      buildIdentityKey({ name: "山崎", age: 12 }),
    );
    expect(buildIdentityKey({ name: "山崎", caskType: "シェリー­" })).toBe(
      buildIdentityKey({ name: "山崎", caskType: "シェリー" }),
    );
  });

  it("表記ゆれが違っても同じキーになる", () => {
    expect(buildIdentityKey({ name: "ＭＡＣＡＬＬＡＮ", age: 12 })).toBe(
      buildIdentityKey({ name: "macallan ", age: 12 }),
    );
  });

  it("年数と樽の未入力は空文字にする（NULL を消して比較できるようにする）", () => {
    expect(buildIdentityKey({ name: "山崎" })).toBe(
      ["山崎", "", "", "0"].join(SEP),
    );
    expect(buildIdentityKey({ name: "山崎", age: null, caskType: null })).toBe(
      ["山崎", "", "", "0"].join(SEP),
    );
  });

  // "0" にすると NAS と 0 年が同じキーになる。
  it("NAS と 0 年を同じキーにしない", () => {
    expect(buildIdentityKey({ name: "山崎" })).not.toBe(
      buildIdentityKey({ name: "山崎", age: 0 }),
    );
  });

  it("限定版の有無でキーが変わる", () => {
    expect(buildIdentityKey({ name: "山崎", isLimited: true })).not.toBe(
      buildIdentityKey({ name: "山崎", isLimited: false }),
    );
  });

  // 区切りが無いと 銘柄名「山崎12」＋年数なし と 銘柄名「山崎」＋12 年 が同じ文字列になる。
  it("項目の切れ目が違えば別のキーになる", () => {
    expect(buildIdentityKey({ name: "山崎12" })).not.toBe(
      buildIdentityKey({ name: "山崎", age: 12 }),
    );
  });
});
