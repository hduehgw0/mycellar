import { beforeEach, describe, expect, it } from "vitest";

import { listWhiskiesForStats } from "@/features/stats/queries";
import { prisma } from "@/lib/prisma";
import { seedWhisky } from "@/test/seed";

let me: string;
let other: string;

beforeEach(async () => {
  [me, other] = await Promise.all(
    [0, 1].map(async () => (await prisma.user.create({ data: {} })).id),
  );
});

describe("listWhiskiesForStats", () => {
  it("自分の製品だけを返し、他人の製品は出ない", async () => {
    await seedWhisky(me, { country: "日本" });
    await seedWhisky(other, { country: "スコットランド" });

    expect(
      (await listWhiskiesForStats(me)).map((whisky) => whisky.country),
    ).toEqual(["日本"]);
  });

  it("集計に使う項目と本数を返す", async () => {
    await seedWhisky(me, { country: "日本", quantity: 2 });

    expect(await listWhiskiesForStats(me)).toEqual([
      { country: "日本", isLimited: false, _count: { bottles: 2 } },
    ]);
  });
});
