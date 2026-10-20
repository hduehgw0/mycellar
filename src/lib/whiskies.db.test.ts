import { beforeEach, describe, expect, it } from "vitest";

import { toNameKey } from "@/lib/name-key";
import { prisma } from "@/lib/prisma";
import { whiskyCreateSchema } from "@/lib/schemas/whisky";
import {
  createWhisky,
  deleteWhisky,
  getOwnedWhisky,
  updateWhisky,
} from "@/lib/whiskies";

let me: string;
let other: string;

// 利用者は同時に作る。順に作ると DB への接続が 1 本しか開かず、
// 二重送信のテストがロックなしでも通ってしまう。
beforeEach(async () => {
  [me, other] = await Promise.all(
    [0, 1].map(async () => (await prisma.user.create({ data: {} })).id),
  );
});

const input = (over: Record<string, unknown> = {}) =>
  whiskyCreateSchema.parse({ name: "山崎 12年", ...over });

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

const findWhisky = (id: string) => prisma.whisky.findUnique({ where: { id } });

const bottleIds = async (whiskyId: string) =>
  (
    await prisma.userBottle.findMany({
      where: { whiskyId },
      select: { id: true },
    })
  ).map(({ id }) => id);

describe("createWhisky", () => {
  it("nameKey と所有者を付け、本数分のボトルと一緒に作る", async () => {
    const result = await createWhisky(me, input({ quantity: 3 }));

    expect(result.status).toBe("created");
    const id = result.status === "created" ? result.id : "";
    expect(await findWhisky(id)).toMatchObject({
      name: "山崎 12年",
      nameKey: "山崎12年",
      userId: me,
    });
    expect(
      await prisma.userBottle.count({ where: { whiskyId: id, userId: me } }),
    ).toBe(3);
  });

  // 所有者は入力より後ろに書いて上書きする。順番を逆にすると、送られた userId で他人の製品を作れる。
  it("入力に userId が混ざっていても、所有者は引数の userId になる", async () => {
    const tampered = { ...input(), userId: other };

    await createWhisky(me, tampered);

    expect(await prisma.whisky.findMany({ select: { userId: true } })).toEqual([
      { userId: me },
    ]);
  });

  it("表記の揺れた同じ製品名なら作らずに、既存の製品を返す", async () => {
    const existing = await seedWhisky(me, { country: "日本", age: 12 });

    const result = await createWhisky(me, input({ name: "山崎１２年" }));

    expect(result).toEqual({
      status: "duplicate",
      // 重複のカードに出す項目だけを返す。
      whisky: { id: existing, name: "山崎 12年", country: "日本", age: 12 },
    });
    expect(await prisma.whisky.count()).toBe(1);
    expect(await prisma.userBottle.count()).toBe(1);
  });

  it("他人が同じ製品名を持っていても作れる", async () => {
    await seedWhisky(other);

    const result = await createWhisky(me, input());

    expect(result.status).toBe("created");
  });

  it("重複以外のエラーは握り潰さない", async () => {
    await expect(createWhisky("user_missing", input())).rejects.toThrow();
  });
});

describe("updateWhisky", () => {
  it("送られた項目だけを更新する", async () => {
    const id = await seedWhisky(me, { country: "日本" });

    const result = await updateWhisky(me, id, { age: 12 });

    expect(result).toEqual({ status: "updated" });
    expect(await findWhisky(id)).toMatchObject({ country: "日本", age: 12 });
  });

  it("製品名を変えたら nameKey も作り直す", async () => {
    const id = await seedWhisky(me);

    await updateWhisky(me, id, { name: "山崎 18年" });

    expect(await findWhisky(id)).toMatchObject({
      name: "山崎 18年",
      nameKey: "山崎18年",
    });
  });

  it("空の更新でも、自分の製品なら成功にする", async () => {
    const id = await seedWhisky(me);

    const result = await updateWhisky(me, id, {});

    expect(result).toEqual({ status: "updated" });
  });

  it("他人の製品は更新せずに notFound", async () => {
    const id = await seedWhisky(other);

    const result = await updateWhisky(me, id, { age: 12 });

    expect(result).toEqual({ status: "notFound" });
    expect(await findWhisky(id)).toMatchObject({ age: null });
  });

  it("製品名の変更で自分の別の製品と重なったら、既存の製品を返して何も変えない", async () => {
    const existing = await seedWhisky(me);
    const id = await seedWhisky(me, { name: "白州" });

    const result = await updateWhisky(me, id, { name: "山崎 12年", age: 18 });

    expect(result).toEqual({
      status: "duplicate",
      whisky: { id: existing, name: "山崎 12年", country: null, age: null },
    });
    expect(await findWhisky(id)).toMatchObject({ name: "白州", age: null });
  });
});

describe("updateWhisky の本数", () => {
  it("本数を増やすと、今のボトルを残して足りない分を足す", async () => {
    const id = await seedWhisky(me, { quantity: 2 });
    const before = await bottleIds(id);

    await updateWhisky(me, id, { quantity: 3 });

    const after = await bottleIds(id);
    expect(after).toHaveLength(3);
    expect(after).toEqual(expect.arrayContaining(before));
  });

  it("本数を減らすと、余る分のボトルを消す", async () => {
    const id = await seedWhisky(me, { quantity: 3 });

    await updateWhisky(me, id, { quantity: 1 });

    expect(await bottleIds(id)).toHaveLength(1);
  });

  it("本数が同じなら、ボトルを足しも消しもしない", async () => {
    const id = await seedWhisky(me, { quantity: 2 });
    const before = await bottleIds(id);

    await updateWhisky(me, id, { quantity: 2 });

    expect(await bottleIds(id)).toEqual(before);
  });

  it("本数を送らなければ、ボトルに触れない", async () => {
    const id = await seedWhisky(me, { quantity: 2 });
    const before = await bottleIds(id);

    await updateWhisky(me, id, { age: 12 });

    expect(await bottleIds(id)).toEqual(before);
  });

  it("別の製品のボトルには触れない", async () => {
    const id = await seedWhisky(me, { quantity: 2 });
    const another = await seedWhisky(me, { name: "白州", quantity: 2 });

    await updateWhisky(me, id, { quantity: 1 });

    expect(await bottleIds(another)).toHaveLength(2);
  });

  it("他人の製品の本数は変えない", async () => {
    const id = await seedWhisky(other);

    const result = await updateWhisky(me, id, { quantity: 3 });

    expect(result).toEqual({ status: "notFound" });
    expect(await bottleIds(id)).toHaveLength(1);
  });

  it("製品名が重複したら、本数も変えない", async () => {
    await seedWhisky(me);
    const id = await seedWhisky(me, { name: "白州" });

    await updateWhisky(me, id, { name: "山崎 12年", quantity: 3 });

    expect(await bottleIds(id)).toHaveLength(1);
  });

  // 製品の行をロックしないと、両方が 1 本と数えて 2 本ずつ足し、5 本になる。
  // 他の項目も送ると、製品の UPDATE が行をロックするので、FOR UPDATE が無くても通ってしまう。
  it("本数だけを二重に送っても、送った本数になる", async () => {
    const id = await seedWhisky(me);

    await Promise.all([
      updateWhisky(me, id, { quantity: 3 }),
      updateWhisky(me, id, { quantity: 3 }),
    ]);

    expect(await bottleIds(id)).toHaveLength(3);
  });
});

describe("deleteWhisky", () => {
  it("自分の製品を、ボトルと一緒に消す", async () => {
    const id = await seedWhisky(me, { quantity: 2 });

    const result = await deleteWhisky(me, id);

    expect(result).toEqual({ status: "deleted" });
    expect(await findWhisky(id)).toBeNull();
    expect(await bottleIds(id)).toHaveLength(0);
  });

  it("他人の製品は消さずに notFound", async () => {
    const id = await seedWhisky(other);

    const result = await deleteWhisky(me, id);

    expect(result).toEqual({ status: "notFound" });
    expect(await findWhisky(id)).not.toBeNull();
  });
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
