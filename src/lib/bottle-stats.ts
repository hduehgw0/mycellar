import { normalizeText } from "@/lib/bottle-identity";
import { REGIONS } from "@/lib/schemas/bottle";

// 産地が未設定のボトルもグラフに出す（→ docs/requirements.md「5. スコープ」）。
export const UNSET_REGION = "未設定";

// 集計に要る列だけを受ける。Prisma の Bottle をそのまま渡しても通る。
export type CountableBottle = {
  name: string;
  region: string | null;
  isLimited: boolean;
  quantity: number;
};

export type RegionTotal = { region: string; quantity: number };

export type CollectionStats = {
  total: number;
  brands: number;
  regions: number;
  regionTotals: RegionTotal[];
  limited: number;
  regular: number;
  limitedPercent: number;
};

// 同数のときの並び。産地リストの順で決め、データの取得順で表示が揺れないようにする。
function regionOrder(region: string): number {
  const index = (REGIONS as readonly string[]).indexOf(region);
  return index < 0 ? REGIONS.length : index;
}

export function summarizeCollection(
  bottles: CountableBottle[],
): CollectionStats {
  const brandNames = new Set<string>();
  const quantityByRegion = new Map<string, number>();
  let total = 0;
  let limited = 0;

  for (const bottle of bottles) {
    // 「〜本」は持っている本数なので、件数ではなく quantity の合計で数える。
    total += bottle.quantity;
    if (bottle.isLimited) limited += bottle.quantity;

    // 銘柄数は「山崎 12年」と「山崎 18年」で 1。重複検知の判定キー（4 項目の連結）で数えると
    // 「同じ物」の種類数になってしまうので、銘柄名だけを正規化して異なり数を数える
    // （→ docs/requirements.md「3. 用語定義」・ADR-0013）。
    brandNames.add(normalizeText(bottle.name));

    const region = bottle.region ?? UNSET_REGION;
    quantityByRegion.set(
      region,
      (quantityByRegion.get(region) ?? 0) + bottle.quantity,
    );
  }

  const regionTotals = [...quantityByRegion]
    .map(([region, quantity]) => ({ region, quantity }))
    // 「未設定」は産地ではないので、本数によらず末尾に置く。
    .sort((a, b) => {
      if ((a.region === UNSET_REGION) !== (b.region === UNSET_REGION)) {
        return a.region === UNSET_REGION ? 1 : -1;
      }
      return (
        b.quantity - a.quantity || regionOrder(a.region) - regionOrder(b.region)
      );
    });

  return {
    total,
    brands: brandNames.size,
    regions: regionTotals.filter(({ region }) => region !== UNSET_REGION)
      .length,
    regionTotals,
    limited,
    regular: total - limited,
    limitedPercent: total === 0 ? 0 : Math.round((limited / total) * 100),
  };
}
