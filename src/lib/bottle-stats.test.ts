import { describe, expect, it } from "vitest";

import { summarizeBottles, type BottleForStats } from "./bottle-stats";

const bottle = (over: Partial<BottleForStats> = {}): BottleForStats => ({
  name: "山崎",
  region: null,
  isLimited: false,
  quantity: 1,
  ...over,
});

describe("summarizeBottles", () => {
  it("総本数はレコード数ではなく quantity の合計", () => {
    const stats = summarizeBottles([
      bottle({ quantity: 3 }),
      bottle({ name: "白州", quantity: 2 }),
    ]);

    expect(stats.totalQuantity).toBe(5);
  });

  it("銘柄数は銘柄名だけの異なり数（年数違いは 1 銘柄）", () => {
    const stats = summarizeBottles([
      bottle({ name: "山崎" }),
      bottle({ name: "山崎" }),
      bottle({ name: "白州" }),
    ]);

    expect(stats.brandCount).toBe(2);
  });

  it("銘柄名の表記ゆれで銘柄数を水増ししない", () => {
    const stats = summarizeBottles([
      bottle({ name: "ＭＡＣＡＬＬＡＮ" }),
      bottle({ name: "macallan " }),
    ]);

    expect(stats.brandCount).toBe(1);
  });

  it("産地別の本数を本数の多い順に並べる", () => {
    const stats = summarizeBottles([
      bottle({ region: "日本", quantity: 2 }),
      bottle({ region: "スコットランド", quantity: 3 }),
      bottle({ region: "日本", quantity: 4 }),
    ]);

    expect(stats.regionQuantities).toEqual([
      { region: "日本", quantity: 6 },
      { region: "スコットランド", quantity: 3 },
    ]);
  });

  it("産地が未設定のボトルも数え、本数によらず最後に置く", () => {
    const stats = summarizeBottles([
      bottle({ region: null, quantity: 5 }),
      bottle({ region: "日本", quantity: 1 }),
    ]);

    expect(stats.regionQuantities).toEqual([
      { region: "日本", quantity: 1 },
      { region: null, quantity: 5 },
    ]);
  });

  it("同数のときは産地リストの並び順で決める", () => {
    const stats = summarizeBottles([
      bottle({ region: "日本", quantity: 2 }),
      bottle({ region: "スコットランド", quantity: 2 }),
    ]);

    expect(stats.regionQuantities.map(({ region }) => region)).toEqual([
      "スコットランド",
      "日本",
    ]);
  });

  // 末尾に固定した未設定が最多のとき、先頭は最大ではない。
  it("最も多い産地の本数を返す（未設定が最多でも取りこぼさない）", () => {
    const stats = summarizeBottles([
      bottle({ region: null, quantity: 5 }),
      bottle({ region: "日本", quantity: 1 }),
    ]);

    expect(stats.maxRegionQuantity).toBe(5);
  });

  it("産地数に未設定は数えない", () => {
    const stats = summarizeBottles([
      bottle({ region: "日本" }),
      bottle({ region: "スコットランド" }),
      bottle({ region: null }),
    ]);

    expect(stats.regionCount).toBe(2);
  });

  it("限定版の割合も quantity の合計で出す", () => {
    const stats = summarizeBottles([
      bottle({ isLimited: true, quantity: 1 }),
      bottle({ name: "白州", quantity: 3 }),
    ]);

    expect(stats).toMatchObject({
      limitedQuantity: 1,
      regularQuantity: 3,
      limitedPercent: 25,
    });
  });

  it("0 件でも壊れない（割合は 0 で、0 除算にしない）", () => {
    expect(summarizeBottles([])).toEqual({
      totalQuantity: 0,
      brandCount: 0,
      regionCount: 0,
      regionQuantities: [],
      maxRegionQuantity: 0,
      limitedQuantity: 0,
      regularQuantity: 0,
      limitedPercent: 0,
    });
  });
});
