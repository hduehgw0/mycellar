import { describe, expect, it } from "vitest";

import {
  countBottles,
  summarizeCollection,
  type WhiskyForStats,
} from "./collection-stats";

const whisky = ({
  country = null,
  isLimited = false,
  bottles = 1,
}: {
  country?: string | null;
  isLimited?: boolean;
  bottles?: number;
} = {}): WhiskyForStats => ({ country, isLimited, _count: { bottles } });

describe("countBottles", () => {
  it("総本数は製品の数ではなく、ボトルの数の合計", () => {
    expect(countBottles([whisky({ bottles: 3 }), whisky({ bottles: 2 })])).toBe(
      5,
    );
  });
});

describe("summarizeCollection", () => {
  it("製品数は製品の数（本数によらない）", () => {
    const stats = summarizeCollection([
      whisky({ bottles: 3 }),
      whisky({ bottles: 2 }),
    ]);

    expect(stats).toMatchObject({ totalBottleCount: 5, whiskyCount: 2 });
  });

  it("国別の本数を本数の多い順に並べる", () => {
    const stats = summarizeCollection([
      whisky({ country: "日本", bottles: 2 }),
      whisky({ country: "スコットランド", bottles: 3 }),
      whisky({ country: "日本", bottles: 4 }),
    ]);

    expect(stats.bottleCountsByCountry).toEqual([
      { country: "日本", bottleCount: 6 },
      { country: "スコットランド", bottleCount: 3 },
    ]);
  });

  it("国が未設定の製品も数え、本数によらず最後に置く", () => {
    const stats = summarizeCollection([
      whisky({ country: null, bottles: 5 }),
      whisky({ country: "日本", bottles: 1 }),
    ]);

    expect(stats.bottleCountsByCountry).toEqual([
      { country: "日本", bottleCount: 1 },
      { country: null, bottleCount: 5 },
    ]);
  });

  it("「その他」は国ではないので、本数によらず未設定の手前に置く", () => {
    const stats = summarizeCollection([
      whisky({ country: null, bottles: 2 }),
      whisky({ country: "その他", bottles: 5 }),
      whisky({ country: "日本", bottles: 1 }),
    ]);

    expect(stats.bottleCountsByCountry.map(({ country }) => country)).toEqual([
      "日本",
      "その他",
      null,
    ]);
  });

  it("同数のときは国のリストの並び順で決める", () => {
    const stats = summarizeCollection([
      whisky({ country: "日本", bottles: 2 }),
      whisky({ country: "スコットランド", bottles: 2 }),
    ]);

    expect(stats.bottleCountsByCountry.map(({ country }) => country)).toEqual([
      "スコットランド",
      "日本",
    ]);
  });

  // 末尾に固定した未設定が最多のとき、先頭は最大ではない。
  it("最も多い国の本数を返す（未設定が最多でも取りこぼさない）", () => {
    const stats = summarizeCollection([
      whisky({ country: null, bottles: 5 }),
      whisky({ country: "日本", bottles: 1 }),
    ]);

    expect(stats.maxCountryBottleCount).toBe(5);
  });

  // 「その他」は中に何か国あるか分からないので、1 か国とも数えない。
  it("国の数に未設定と「その他」は数えない", () => {
    const stats = summarizeCollection([
      whisky({ country: "日本" }),
      whisky({ country: "スコットランド" }),
      whisky({ country: "その他" }),
      whisky({ country: null }),
    ]);

    expect(stats.countryCount).toBe(2);
  });

  it("限定版の割合はボトルの数で出す", () => {
    const stats = summarizeCollection([
      whisky({ isLimited: true, bottles: 1 }),
      whisky({ bottles: 3 }),
    ]);

    expect(stats).toMatchObject({
      limitedBottleCount: 1,
      regularBottleCount: 3,
      limitedPercent: 25,
    });
  });

  it.each([
    [1, 250, 0.4],
    [249, 250, 99.6],
  ])(
    "限定版の割合は丸めない（%d / %d 本は %d%）",
    (limited, total, percent) => {
      const stats = summarizeCollection([
        whisky({ isLimited: true, bottles: limited }),
        whisky({ bottles: total - limited }),
      ]);

      expect(stats.limitedPercent).toBeCloseTo(percent);
    },
  );

  it("0 件でも壊れない（割合は 0 で、0 除算にしない）", () => {
    expect(summarizeCollection([])).toEqual({
      totalBottleCount: 0,
      whiskyCount: 0,
      countryCount: 0,
      bottleCountsByCountry: [],
      maxCountryBottleCount: 0,
      limitedBottleCount: 0,
      regularBottleCount: 0,
      limitedPercent: 0,
    });
  });
});
