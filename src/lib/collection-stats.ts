import type { Prisma } from "@/generated/prisma/client";
import { COUNTRIES } from "@/lib/schemas/whisky";

// 傾向ページはこの select で取る。型をここから作るので、集計が使う列を select から消すと型エラーになる。
export const WHISKY_STATS_SELECT = {
  country: true,
  isLimited: true,
  _count: { select: { bottles: true } },
} satisfies Prisma.WhiskySelect;

export type WhiskyForStats = Prisma.WhiskyGetPayload<{
  select: typeof WHISKY_STATS_SELECT;
}>;

// 総本数は製品の数ではなく、ボトルの数。数え方をここ 1 か所にまとめる（#93）。
export function countBottles(
  whiskies: { _count: { bottles: number } }[],
): number {
  return whiskies.reduce((sum, whisky) => sum + whisky._count.bottles, 0);
}

// 国は null のまま返し、「未設定」という表示は画面に任せる（→ docs/requirements.md「5. スコープ」）。
export type CountryBottleCount = {
  country: string | null;
  bottleCount: number;
};

export type CollectionStats = {
  totalBottleCount: number;
  whiskyCount: number;
  countryCount: number;
  bottleCountsByCountry: CountryBottleCount[];
  maxCountryBottleCount: number;
  limitedBottleCount: number;
  regularBottleCount: number;
  limitedPercent: number;
};

// 「その他」はリストに無い国をまとめる受け皿で、1 つの国ではない。
const OTHER_COUNTRY = "その他";

// 国でない区分は、本数によらず末尾に置く（その他 → 未設定）。
function countryGroup(country: string | null): number {
  if (country === null) return 2;
  return country === OTHER_COUNTRY ? 1 : 0;
}

// 同数のときの並び。国のリストの順で決め、データの取得順で表示が揺れないようにする。
function countryOrder(country: string | null): number {
  const index = (COUNTRIES as readonly (string | null)[]).indexOf(country);
  return index < 0 ? COUNTRIES.length : index;
}

export function summarizeCollection(
  whiskies: WhiskyForStats[],
): CollectionStats {
  const bottleCountByCountry = new Map<string | null, number>();
  let limitedBottleCount = 0;

  for (const { country, isLimited, _count } of whiskies) {
    if (isLimited) limitedBottleCount += _count.bottles;
    bottleCountByCountry.set(
      country,
      (bottleCountByCountry.get(country) ?? 0) + _count.bottles,
    );
  }

  const bottleCountsByCountry = [...bottleCountByCountry]
    .map(([country, bottleCount]) => ({ country, bottleCount }))
    .sort(
      (a, b) =>
        countryGroup(a.country) - countryGroup(b.country) ||
        b.bottleCount - a.bottleCount ||
        countryOrder(a.country) - countryOrder(b.country),
    );

  const totalBottleCount = countBottles(whiskies);

  return {
    totalBottleCount,
    whiskyCount: whiskies.length,
    countryCount: bottleCountsByCountry.filter(
      ({ country }) => countryGroup(country) === 0,
    ).length,
    bottleCountsByCountry,
    maxCountryBottleCount: Math.max(
      0,
      ...bottleCountsByCountry.map(({ bottleCount }) => bottleCount),
    ),
    limitedBottleCount,
    regularBottleCount: totalBottleCount - limitedBottleCount,
    limitedPercent:
      totalBottleCount === 0
        ? 0
        : Math.round((limitedBottleCount / totalBottleCount) * 100),
  };
}
