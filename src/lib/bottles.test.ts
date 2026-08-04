import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, type Bottle } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createBottle, updateBottle } from "@/lib/bottles";
import { bottleSchema, bottleUpdateSchema } from "@/lib/schemas/bottle";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bottle: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  },
}));

const existing = { id: "bottle_existing", name: "山崎" } as Bottle;

const duplicateError = new Prisma.PrismaClientKnownRequestError("duplicate", {
  code: "P2002",
  clientVersion: "test",
});

const input = (over: Record<string, unknown> = {}) =>
  bottleSchema.parse({ name: "山崎", age: 12, ...over });

// 更新は全項目そろっていることが前提（空欄は null）。
const updateInput = (over: Record<string, unknown> = {}) =>
  bottleUpdateSchema.parse({
    name: "山崎",
    region: null,
    subRegion: null,
    age: 12,
    caskType: null,
    isLimited: false,
    quantity: 1,
    note: null,
    ...over,
  });

// data に渡された identityKey を取り出す。
const keyPassedTo = (fn: { mock: { calls: unknown[][] } }) =>
  (fn.mock.calls[0][0] as { data: { identityKey: string } }).data.identityKey;

beforeEach(() => {
  vi.mocked(prisma.bottle.create)
    .mockReset()
    .mockResolvedValue({ id: "bottle_1" } as Bottle);
  vi.mocked(prisma.bottle.updateMany).mockReset().mockResolvedValue({
    count: 1,
  });
  vi.mocked(prisma.bottle.findUnique).mockReset().mockResolvedValue(existing);
});

describe("createBottle", () => {
  it("判定キーとログインユーザーを付けて保存する", async () => {
    const result = await createBottle("user_me", input());

    expect(result).toEqual({ status: "created", bottle: { id: "bottle_1" } });
    expect(prisma.bottle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "山崎",
        userId: "user_me",
        identityKey: expect.any(String),
      }),
    });
  });

  it("一意制約に当たったら衝突相手のボトルを返す", async () => {
    vi.mocked(prisma.bottle.create).mockRejectedValue(duplicateError);

    const result = await createBottle("user_me", input());

    expect(result).toEqual({ status: "duplicate", bottle: existing });
    // P2002 は衝突相手の行を持たないので、判定キーで取りに行く。
    expect(prisma.bottle.findUnique).toHaveBeenCalledWith({
      where: {
        userId_identityKey: {
          userId: "user_me",
          identityKey: expect.any(String),
        },
      },
    });
  });

  it("重複以外のエラーは握り潰さない", async () => {
    vi.mocked(prisma.bottle.create).mockRejectedValue(new Error("boom"));

    await expect(createBottle("user_me", input())).rejects.toThrow("boom");
  });
});

describe("updateBottle", () => {
  it("判定キーを付け直して更新する", async () => {
    const result = await updateBottle("user_me", "bottle_1", updateInput());

    expect(result).toEqual({ status: "updated" });
    expect(prisma.bottle.updateMany).toHaveBeenCalledWith({
      // 認可：他人のボトルは更新できない。
      where: { id: "bottle_1", userId: "user_me" },
      data: expect.objectContaining({ identityKey: expect.any(String) }),
    });
  });

  it("自分のボトルが無ければ notFound", async () => {
    vi.mocked(prisma.bottle.updateMany).mockResolvedValue({ count: 0 });

    const result = await updateBottle("user_me", "bottle_1", updateInput());

    expect(result).toEqual({ status: "notFound" });
  });

  it("編集で別のボトルと同じ物になったら衝突相手を返す", async () => {
    vi.mocked(prisma.bottle.updateMany).mockRejectedValue(duplicateError);

    const result = await updateBottle("user_me", "bottle_1", updateInput());

    expect(result).toEqual({ status: "duplicate", bottle: existing });
  });
});

// 登録と編集でキーの作り方がずれると、編集した瞬間に重複が素通りする。
it("同じ入力なら登録と編集で同じ判定キーになる", async () => {
  await createBottle("user_me", input());
  await updateBottle("user_me", "bottle_1", updateInput());

  expect(keyPassedTo(vi.mocked(prisma.bottle.create))).toBe(
    keyPassedTo(vi.mocked(prisma.bottle.updateMany)),
  );
});
