import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Prisma,
  type UserBottle,
  type Whisky,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { whiskyCreateSchema } from "@/lib/schemas/whisky";
import { createWhisky, updateWhisky } from "@/lib/whiskies";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    whisky: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    userBottle: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    // トランザクション内の操作も、同じモックで確かめる。
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { prisma };
});

const existing = { id: "whisky_existing", name: "山崎 12年" } as Whisky;

const duplicateError = new Prisma.PrismaClientKnownRequestError("duplicate", {
  code: "P2002",
  clientVersion: "test",
});

const input = (over: Record<string, unknown> = {}) =>
  whiskyCreateSchema.parse({ name: "山崎 12年", ...over });

beforeEach(() => {
  vi.mocked(prisma.whisky.create)
    .mockReset()
    .mockResolvedValue({ id: "whisky_1" } as Whisky);
  vi.mocked(prisma.whisky.update).mockReset();
  vi.mocked(prisma.whisky.findUnique).mockReset().mockResolvedValue(existing);
  vi.mocked(prisma.userBottle.findMany).mockReset().mockResolvedValue([]);
  vi.mocked(prisma.userBottle.createMany).mockReset();
  vi.mocked(prisma.userBottle.deleteMany).mockReset();
  // ロックのクエリが自分の製品を 1 行返す（＝自分の製品がある）。
  vi.mocked(prisma.$queryRaw)
    .mockReset()
    .mockResolvedValue([{ id: "whisky_1" }]);
});

const notOwned = () => vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

// 今あるボトル。
const bottles = (...ids: string[]) =>
  vi
    .mocked(prisma.userBottle.findMany)
    .mockResolvedValue(ids.map((id) => ({ id }) as UserBottle));

describe("createWhisky", () => {
  it("nameKey とログインユーザーを付け、本数分のボトルと一緒に作る", async () => {
    const result = await createWhisky("user_me", input({ quantity: 3 }));

    expect(result).toEqual({ status: "created", whisky: { id: "whisky_1" } });
    expect(prisma.whisky.create).toHaveBeenCalledWith({
      data: {
        name: "山崎 12年",
        nameKey: "山崎12年",
        isLimited: false,
        userId: "user_me",
        // 本数は製品の列ではなく、ボトルの行数として持つ。
        bottles: { createMany: { data: [{}, {}, {}] } },
      },
    });
  });

  it("一意制約に当たったら既存の製品を返す", async () => {
    vi.mocked(prisma.whisky.create).mockRejectedValue(duplicateError);

    const result = await createWhisky("user_me", input());

    expect(result).toEqual({ status: "duplicate", whisky: existing });
    expect(prisma.whisky.findUnique).toHaveBeenCalledWith({
      where: { userId_nameKey: { userId: "user_me", nameKey: "山崎12年" } },
    });
  });

  it("重複以外のエラーは握り潰さない", async () => {
    vi.mocked(prisma.whisky.create).mockRejectedValue(new Error("boom"));

    await expect(createWhisky("user_me", input())).rejects.toThrow("boom");
  });
});

describe("updateWhisky", () => {
  it("送られた項目だけを、自分の製品に対して更新する", async () => {
    const result = await updateWhisky("user_me", "whisky_1", { age: 12 });

    expect(result).toEqual({ status: "updated" });
    // 認可：ロックのクエリを製品の id と自分の userId で絞る（他人の製品は 0 行になる）。
    expect(vi.mocked(prisma.$queryRaw).mock.calls[0].slice(1)).toEqual([
      "whisky_1",
      "user_me",
    ]);
    expect(prisma.whisky.update).toHaveBeenCalledWith({
      where: { id: "whisky_1" },
      data: { age: 12 },
    });
  });

  it("製品名を変えたら nameKey も作り直す", async () => {
    await updateWhisky("user_me", "whisky_1", { name: "山崎 18年" });

    expect(prisma.whisky.update).toHaveBeenCalledWith({
      where: { id: "whisky_1" },
      data: { name: "山崎 18年", nameKey: "山崎18年" },
    });
  });

  it("空の更新でも、自分の製品なら成功にする", async () => {
    const result = await updateWhisky("user_me", "whisky_1", {});

    expect(result).toEqual({ status: "updated" });
  });

  it("自分の製品が無ければ、更新せずに notFound", async () => {
    notOwned();

    const result = await updateWhisky("user_me", "whisky_1", { age: 12 });

    expect(result).toEqual({ status: "notFound" });
    expect(prisma.whisky.update).not.toHaveBeenCalled();
  });

  it("製品名の変更で別の製品と重なったら既存の製品を返す", async () => {
    vi.mocked(prisma.whisky.update).mockRejectedValue(duplicateError);

    const result = await updateWhisky("user_me", "whisky_1", {
      name: "山崎 12年",
    });

    expect(result).toEqual({ status: "duplicate", whisky: existing });
    expect(prisma.whisky.findUnique).toHaveBeenCalledWith({
      where: { userId_nameKey: { userId: "user_me", nameKey: "山崎12年" } },
    });
  });
});

describe("updateWhisky の本数", () => {
  it("本数を増やすと、足りない分のボトルを足す", async () => {
    bottles("b2", "b1");

    await updateWhisky("user_me", "whisky_1", { quantity: 3 });

    // 別の製品や他人のボトルを数えない。
    expect(prisma.userBottle.findMany).toHaveBeenCalledWith({
      where: { whiskyId: "whisky_1", userId: "user_me" },
      select: { id: true },
    });
    expect(prisma.userBottle.createMany).toHaveBeenCalledWith({
      data: [{ whiskyId: "whisky_1", userId: "user_me" }],
    });
    expect(prisma.userBottle.deleteMany).not.toHaveBeenCalled();
  });

  it("本数を減らすと、余る分のボトルを消す", async () => {
    bottles("b3", "b2", "b1");

    await updateWhisky("user_me", "whisky_1", { quantity: 1 });

    expect(prisma.userBottle.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["b3", "b2"] } },
    });
    expect(prisma.userBottle.createMany).not.toHaveBeenCalled();
  });

  it("本数が同じならボトルを足しも消しもしない", async () => {
    bottles("b2", "b1");

    await updateWhisky("user_me", "whisky_1", { quantity: 2 });

    expect(prisma.userBottle.createMany).not.toHaveBeenCalled();
    expect(prisma.userBottle.deleteMany).not.toHaveBeenCalled();
  });

  // ロックしないと、二重送信で両方が同じ本数を数えて足しすぎる。
  it("ボトルを数える前に製品の行をロックする", async () => {
    await updateWhisky("user_me", "whisky_1", { quantity: 3 });

    expect(
      vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(prisma.userBottle.findMany).mock.invocationCallOrder[0],
    );
  });

  it("本数を送らなければボトルに触れない", async () => {
    await updateWhisky("user_me", "whisky_1", { age: 12 });

    expect(prisma.userBottle.findMany).not.toHaveBeenCalled();
  });

  it("自分の製品が無ければ本数も変えない", async () => {
    notOwned();

    const result = await updateWhisky("user_me", "whisky_1", { quantity: 3 });

    expect(result).toEqual({ status: "notFound" });
    expect(prisma.userBottle.findMany).not.toHaveBeenCalled();
  });

  it("製品名が重複したら本数も変えない", async () => {
    vi.mocked(prisma.whisky.update).mockRejectedValue(duplicateError);

    const result = await updateWhisky("user_me", "whisky_1", {
      name: "山崎 12年",
      quantity: 3,
    });

    expect(result).toEqual({ status: "duplicate", whisky: existing });
    expect(prisma.userBottle.findMany).not.toHaveBeenCalled();
  });
});
