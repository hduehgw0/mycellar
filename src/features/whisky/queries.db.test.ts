import { beforeEach, describe, expect, it } from "vitest";

import { getOwnedWhisky } from "@/features/whisky/queries";
import { prisma } from "@/lib/prisma";
import { seedWhisky } from "@/test/seed";

let me: string;
let other: string;

beforeEach(async () => {
  [me, other] = await Promise.all(
    [0, 1].map(async () => (await prisma.user.create({ data: {} })).id),
  );
});

describe("getOwnedWhisky", () => {
  it("自分の製品を、画面に出す項目と本数だけで返す", async () => {
    const id = await seedWhisky(me, { country: "日本", age: 12, quantity: 2 });

    expect(await getOwnedWhisky(me, id)).toEqual({
      id,
      name: "山崎 12年",
      country: "日本",
      region: null,
      age: 12,
      caskType: null,
      isLimited: false,
      memo: null,
      _count: { bottles: 2 },
    });
  });

  it("他人の製品は引けない", async () => {
    const id = await seedWhisky(other);

    expect(await getOwnedWhisky(me, id)).toBeNull();
  });
});
