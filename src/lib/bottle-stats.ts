import type { Bottle } from "@/generated/prisma/client";
import { normalizeText } from "@/lib/bottle-identity";
import { REGIONS } from "@/lib/schemas/bottle";

// 数えるのに要る列だけ。列名や型が変わったらここで型エラーになる。
export type BottleForStats = Pick<
  Bottle,
  "name" | "region" | "isLimited" | "quantity"
>;

// 産地は null のまま返し、「未設定」という表示は画面に任せる（→ docs/requirements.md「5. スコープ」）。
// Quantity は本数（quantity の合計）、Count は異なり数（銘柄・産地の種類）を数えたもの。
export type RegionQuantity = { region: string | null; quantity: number };

export type BottleStats = {
  totalQuantity: number;
  brandCount: number; // brand は銘柄名（Bottle.name）。単体で意味が要るので name と呼ばない
  regionCount: number;
  regionQuantities: RegionQuantity[];
  maxRegionQuantity: number;
  limitedQuantity: number;
  regularQuantity: number;
  limitedPercent: number;
};

// 同数のときの並び。産地リストの順で決め、データの取得順で表示が揺れないようにする。
function regionOrder(region: string): number {
  const index = (REGIONS as readonly string[]).indexOf(region);
  return index < 0 ? REGIONS.length : index;
}

export function summarizeBottles(bottles: BottleForStats[]): BottleStats {
  const brandNames = new Set<string>();
  const quantityByRegion = new Map<string | null, number>();
  let totalQuantity = 0;
  let limitedQuantity = 0;

  for (const bottle of bottles) {
    // 「〜本」は持っている本数なので、件数ではなく quantity の合計で数える。
    totalQuantity += bottle.quantity;
    if (bottle.isLimited) limitedQuantity += bottle.quantity;

    // brandNamesは最終的に銘柄数(brandCount)として返すため、normalizeTextで正規化して重複を除く。
    brandNames.add(normalizeText(bottle.name));

    quantityByRegion.set(
      bottle.region,
      (quantityByRegion.get(bottle.region) ?? 0) + bottle.quantity,
    );
  }

  const regionQuantities = [...quantityByRegion]
    .map(([region, quantity]) => ({ region, quantity }))
    .sort((a, b) => {
      // 未設定は産地ではないので、本数によらず末尾に置く。
      if (a.region === null) return b.region === null ? 0 : 1;
      if (b.region === null) return -1;
      return (
        b.quantity - a.quantity || regionOrder(a.region) - regionOrder(b.region)
      );
    });

  return {
    totalQuantity,
    brandCount: brandNames.size,
    regionCount: regionQuantities.filter(({ region }) => region !== null)
      .length,
    regionQuantities,
    maxRegionQuantity: Math.max(
      0,
      ...regionQuantities.map(({ quantity }) => quantity),
    ),
    limitedQuantity,
    regularQuantity: totalQuantity - limitedQuantity,
    limitedPercent:
      totalQuantity === 0
        ? 0
        : Math.round((limitedQuantity / totalQuantity) * 100),
  };
}
