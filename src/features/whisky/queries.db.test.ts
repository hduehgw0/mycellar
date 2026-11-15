import { beforeEach, describe, expect, it } from "vitest";

import { getOwnedWhisky, listWhiskies } from "@/features/whisky/queries";
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

describe("listWhiskies", () => {
  it("自分の製品だけを返し、他人の製品は出ない", async () => {
    const id = await seedWhisky(me);
    await seedWhisky(other);

    expect((await listWhiskies(me)).map((whisky) => whisky.id)).toEqual([id]);
  });

  it("新しく登録した順に並ぶ", async () => {
    // 並べる指定が無いと、DB は作った順・その逆・製品名の索引の順などで返しうる。
    // どれとも違う並びを期待して、並べる指定が無ければ落ちるようにする。
    const middle = await seedWhisky(me, {
      name: "山崎 12年",
      createdAt: new Date("2026-01-02"),
    });
    const newest = await seedWhisky(me, {
      name: "響 17年",
      createdAt: new Date("2026-01-03"),
    });
    const oldest = await seedWhisky(me, {
      name: "白州 12年",
      createdAt: new Date("2026-01-01"),
    });

    expect((await listWhiskies(me)).map((whisky) => whisky.id)).toEqual([
      newest,
      middle,
      oldest,
    ]);
  });

  it("カードに出す項目と本数だけを返す", async () => {
    const id = await seedWhisky(me, { country: "日本", age: 12, quantity: 2 });

    expect(await listWhiskies(me)).toEqual([
      {
        id,
        name: "山崎 12年",
        country: "日本",
        region: null,
        age: 12,
        isLimited: false,
        _count: { bottles: 2 },
      },
    ]);
  });
});
