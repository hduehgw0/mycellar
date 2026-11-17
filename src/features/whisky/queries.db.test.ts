import { beforeEach, describe, expect, it } from "vitest";

import { getOwnedWhisky, listWhiskies } from "@/features/whisky/queries";
import { seedUser, seedWhisky } from "@/test/seed";

let me: string;
let other: string;

beforeEach(async () => {
  me = await seedUser();
  other = await seedUser();
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
      isNas: false,
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
    const older = await seedWhisky(me, {
      name: "アードベッグ 10年",
      createdAt: new Date("2026-01-01"),
    });
    const newer = await seedWhisky(me, {
      name: "ラフロイグ 10年",
      createdAt: new Date("2026-01-02"),
    });

    expect((await listWhiskies(me)).map((whisky) => whisky.id)).toEqual([
      newer,
      older,
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
        isNas: false,
        isLimited: false,
        _count: { bottles: 2 },
      },
    ]);
  });
});
