import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { bottle: { updateMany: vi.fn(), deleteMany: vi.fn() } },
}));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

const session = { user: { id: "user_me" } } as unknown as Session;

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
});

describe("PATCH /api/bottles/[id]", () => {
  it("未ログインなら 401 で、更新しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await patch("bottle_1", { name: "山崎" });

    expect(response.status).toBe(401);
    expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
  });

  it("銘柄名が無ければ 400 で、更新しない", async () => {
    const response = await patch("bottle_1", { name: "" });

    expect(response.status).toBe(400);
    expect(prisma.bottle.updateMany).not.toHaveBeenCalled();
  });

  it("他人の/存在しない id は 404（自分の userId で絞るので該当 0 件）", async () => {
    vi.mocked(prisma.bottle.updateMany).mockResolvedValue({ count: 0 });

    const response = await patch("bottle_other", { name: "山崎" });

    expect(response.status).toBe(404);
  });

  it("正常な入力なら 200 で、自分の userId で絞って更新する（他人の id は更新できない＝認可）", async () => {
    const response = await patch("bottle_1", { name: "山崎", quantity: 2 });

    expect(response.status).toBe(200);
    expect(prisma.bottle.updateMany).toHaveBeenCalledWith({
      where: { id: "bottle_1", userId: "user_me" },
      data: { name: "山崎", quantity: 2, isLimited: false },
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
