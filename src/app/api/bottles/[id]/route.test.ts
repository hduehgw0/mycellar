import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";
import { Prisma, type Bottle } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bottle: { updateMany: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() },
  },
}));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

const session = { user: { id: "user_me" } } as unknown as Session;

const existing = { id: "bottle_existing", name: "山崎" } as Bottle;

const duplicateError = new Prisma.PrismaClientKnownRequestError("duplicate", {
  code: "P2002",
  clientVersion: "test",
});

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/bottles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function del(id: string) {
  return DELETE(
    new Request(`http://localhost/api/bottles/${id}`, { method: "DELETE" }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.mocked(getSession).mockResolvedValue(session);
  vi.mocked(prisma.bottle.updateMany)
    .mockReset()
    .mockResolvedValue({ count: 1 });
  vi.mocked(prisma.bottle.deleteMany)
    .mockReset()
    .mockResolvedValue({ count: 1 });
  vi.mocked(prisma.bottle.findUnique).mockReset().mockResolvedValue(existing);
});

// 更新は全項目を置き換えるため、省略も空文字も受け付けない（→ ADR-0011）。
const fullBody = {
  name: "山崎",
  region: null,
  subRegion: null,
  age: 12,
  caskType: null,
  isLimited: false,
  quantity: 1,
  note: null,
};

describe("PATCH /api/bottles/[id]", () => {
  it("未ログインなら 401 で、更新しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await patch("bottle_1", fullBody);

    expect(response.status).toBe(401);
    expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
  });

  it("銘柄名が無ければ 400 で、更新しない", async () => {
    const response = await patch("bottle_1", { ...fullBody, name: "" });

    expect(response.status).toBe(400);
    expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
  });

  // 省略すると、Prisma に届かない項目が出て保存される行と判定キーが食い違う。
  // .default() を持つ項目（isLimited・quantity）は逆に既定値で上書きされ、値が消える。
  it.each(Object.keys(fullBody))(
    "%s を省くと 400 で、更新しない",
    async (key) => {
      const partial = Object.fromEntries(
        Object.entries(fullBody).filter(([name]) => name !== key),
      );

      const response = await patch("bottle_1", partial);

      expect(response.status).toBe(400);
      expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
    },
  );

  // 空文字は undefined に変換され、省略と同じ食い違いを起こす。消すなら null を送る。
  it.each(["subRegion", "caskType", "note"] as const)(
    "%s を空文字で送ると 400 で、更新しない",
    async (key) => {
      const response = await patch("bottle_1", { ...fullBody, [key]: "" });

      expect(response.status).toBe(400);
      expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
    },
  );

  it("他人の/存在しない id は 404（自分の userId で絞るので該当 0 件）", async () => {
    vi.mocked(prisma.bottle.updateMany).mockResolvedValue({ count: 0 });

    const response = await patch("bottle_other", fullBody);

    expect(response.status).toBe(404);
  });

  it("正常な入力なら 200 で、自分の userId で絞って更新する（他人の id は更新できない＝認可）", async () => {
    const response = await patch("bottle_1", { ...fullBody, quantity: 2 });

    expect(response.status).toBe(200);
    expect(prisma.bottle.updateMany).toHaveBeenCalledWith({
      where: { id: "bottle_1", userId: "user_me" },
      data: { ...fullBody, quantity: 2, identityKey: expect.any(String) },
    });
  });

  it("編集で別のボトルと同じ物になると 409 で、既存のボトルを返す", async () => {
    vi.mocked(prisma.bottle.updateMany).mockRejectedValue(duplicateError);

    const response = await patch("bottle_1", fullBody);

    expect(response.status).toBe(409);
    // クライアントはこの id で詳細へ辿る。
    expect(await response.json()).toMatchObject({
      bottle: { id: "bottle_existing" },
    });
  });

  it("任意項目を null で送ると、その値を消す（null が更新データに渡る）", async () => {
    const response = await patch("bottle_1", {
      name: "山崎",
      quantity: 1,
      isLimited: false,
      age: null,
      region: null,
      subRegion: null,
      caskType: null,
      note: null,
    });

    expect(response.status).toBe(200);
    expect(prisma.bottle.updateMany).toHaveBeenCalledWith({
      where: { id: "bottle_1", userId: "user_me" },
      data: expect.objectContaining({
        age: null,
        region: null,
        subRegion: null,
        caskType: null,
        note: null,
      }),
    });
  });
});

describe("DELETE /api/bottles/[id]", () => {
  it("未ログインなら 401 で、削除しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await del("bottle_1");

    expect(response.status).toBe(401);
    expect(prisma.bottle.deleteMany).not.toHaveBeenCalled();
  });

  it("他人の/存在しない id は 404（自分の userId で絞るので該当 0 件）", async () => {
    vi.mocked(prisma.bottle.deleteMany).mockResolvedValue({ count: 0 });

    const response = await del("bottle_other");

    expect(response.status).toBe(404);
  });

  it("自分のボトルなら 200 で、自分の userId で絞って削除する（他人の id は削除できない＝認可）", async () => {
    const response = await del("bottle_1");

    expect(response.status).toBe(200);
    expect(prisma.bottle.deleteMany).toHaveBeenCalledWith({
      where: { id: "bottle_1", userId: "user_me" },
    });
  });
});
