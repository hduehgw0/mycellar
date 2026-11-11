import { beforeEach, describe, expect, it } from "vitest";

import { toNameKey } from "@/features/whisky/name-key";
import { getOwnedWhisky } from "@/features/whisky/queries";
import { prisma } from "@/lib/prisma";

let me: string;
let other: string;

beforeEach(async () => {
  [me, other] = await Promise.all(
    [0, 1].map(async () => (await prisma.user.create({ data: {} })).id),
  );
});

// テストの前提となる製品は、テストする関数を通さずに作る。
async function seedWhisky(
  userId: string,
  {
    name = "山崎 12年",
    quantity = 1,
    ...fields
  }: { name?: string; quantity?: number; country?: string; age?: number } = {},
) {
  const { id } = await prisma.whisky.create({
    data: {
      ...fields,
      name,
      nameKey: toNameKey(name),
      userId,
      bottles: {
        createMany: { data: Array.from({ length: quantity }, () => ({})) },
      },
    },
  });
  return id;
}

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
