import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, type Whisky } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { whiskyCreateSchema } from "@/lib/schemas/whisky";
import { createWhisky } from "@/lib/whiskies";

vi.mock("@/lib/prisma", () => ({
  prisma: { whisky: { create: vi.fn(), findUnique: vi.fn() } },
}));

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
  vi.mocked(prisma.whisky.findUnique).mockReset().mockResolvedValue(existing);
});

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
