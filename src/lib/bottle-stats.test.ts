import { describe, expect, it } from "vitest";

import {
  UNSET_REGION,
  summarizeCollection,
  type CountableBottle,
} from "./bottle-stats";

const bottle = (over: Partial<CountableBottle> = {}): CountableBottle => ({
  name: "山崎",
  region: null,
  isLimited: false,
  quantity: 1,
  ...over,
});

describe("summarizeCollection", () => {
  it("総本数はレコード数ではなく quantity の合計", () => {
    const stats = summarizeCollection([
      bottle({ quantity: 3 }),
      bottle({ name: "白州", quantity: 2 }),
    ]);

    expect(stats.total).toBe(5);
  });

  it("銘柄数は銘柄名だけの異なり数（年数違いは 1 銘柄）", () => {
    const stats = summarizeCollection([
      bottle({ name: "山崎" }),
      bottle({ name: "山崎" }),
      bottle({ name: "白州" }),
    ]);

    expect(stats.brands).toBe(2);
  });

  it("銘柄名の表記ゆれで銘柄数を水増ししない", () => {
    const stats = summarizeCollection([
      bottle({ name: "ＭＡＣＡＬＬＡＮ" }),
      bottle({ name: "macallan " }),
    ]);

    expect(stats.brands).toBe(1);
  });

  it("産地別の本数を本数の多い順に並べる", () => {
    const stats = summarizeCollection([
      bottle({ region: "日本", quantity: 2 }),
      bottle({ region: "スコットランド", quantity: 3 }),
      bottle({ region: "日本", quantity: 4 }),
    ]);

    expect(stats.regionTotals).toEqual([
      { region: "日本", quantity: 6 },
      { region: "スコットランド", quantity: 3 },
    ]);
  });

  it("産地が未設定のボトルは「未設定」として最後に出す（除外しない）", () => {
    const stats = summarizeCollection([
      bottle({ region: null, quantity: 5 }),
      bottle({ region: "日本", quantity: 1 }),
    ]);

    expect(stats.regionTotals).toEqual([
      { region: "日本", quantity: 1 },
      { region: UNSET_REGION, quantity: 5 },
    ]);
  });

  it("産地数に「未設定」は数えない", () => {
    const stats = summarizeCollection([
      bottle({ region: "日本" }),
      bottle({ region: "スコットランド" }),
      bottle({ region: null }),
    ]);

    expect(stats.regions).toBe(2);
  });

  it("限定版の割合も quantity の合計で出す", () => {
    const stats = summarizeCollection([
      bottle({ isLimited: true, quantity: 1 }),
      bottle({ name: "白州", quantity: 3 }),
    ]);

    expect(stats).toMatchObject({ limited: 1, regular: 3, limitedPercent: 25 });
  });

  it("0 件でも壊れない（割合は 0 で、0 除算にしない）", () => {
    expect(summarizeCollection([])).toEqual({
      total: 0,
      brands: 0,
      regions: 0,
      regionTotals: [],
      limited: 0,
      regular: 0,
      limitedPercent: 0,
    });
  });
});
