import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateWhisky } from "@/lib/whiskies";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { bottle: { deleteMany: vi.fn() } },
}));
// 保存の中身（部分更新・本数の増減・ロック・重複の判定）は whiskies.test.ts で確かめる。
// ここでは HTTP の扱い（認証・検証・ステータス・応答の形）だけを見る。
vi.mock("@/lib/whiskies", () => ({ updateWhisky: vi.fn() }));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

const session = { user: { id: "user_me" } } as unknown as Session;

const existing = {
  id: "whisky_existing",
  name: "ラフロイグ 10年",
  country: "スコットランド",
  age: 10,
};

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
  vi.mocked(updateWhisky).mockReset().mockResolvedValue({ status: "updated" });
  vi.mocked(prisma.bottle.deleteMany)
    .mockReset()
    .mockResolvedValue({ count: 1 });
});

describe("PATCH /api/bottles/[id]", () => {
  it("未ログインなら 401 で、更新しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await patch("whisky_1", { age: 12 });

    expect(response.status).toBe(401);
    expect(updateWhisky).not.toHaveBeenCalled();
  });

  it("送った製品名が空なら 400 で、更新しない", async () => {
    const response = await patch("whisky_1", { name: "" });

    expect(response.status).toBe(400);
    expect(updateWhisky).not.toHaveBeenCalled();
  });

  it("JSON でないボディは 400 で、更新しない", async () => {
    const response = await patch("whisky_1", "not-json");

    expect(response.status).toBe(400);
    expect(updateWhisky).not.toHaveBeenCalled();
  });

  // 部分更新：送っていない項目を既定値で埋めると、その項目を上書きしてしまう。
  it("一部の項目だけを送ると 200 で、送った項目だけを自分の製品の更新に渡す", async () => {
    const response = await patch("whisky_1", { age: 12 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(updateWhisky).toHaveBeenCalledWith("user_me", "whisky_1", {
      age: 12,
    });
  });

  it("任意項目を null や空欄で送ると、値を消す（null を渡す）", async () => {
    await patch("whisky_1", { age: null, memo: "" });

    expect(updateWhisky).toHaveBeenCalledWith("user_me", "whisky_1", {
      age: null,
      memo: null,
    });
  });

  it("他人の/存在しない id は 404", async () => {
    vi.mocked(updateWhisky).mockResolvedValue({ status: "notFound" });

    const response = await patch("whisky_other", { age: 12 });

    expect(response.status).toBe(404);
  });

  it("製品名を変えて別の製品と重なると 409 で、既存の製品を返す", async () => {
    vi.mocked(updateWhisky).mockResolvedValue({
      status: "duplicate",
      whisky: existing,
    });

    const response = await patch("whisky_1", { name: "ラフロイグ 10年" });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "この製品は既に登録されています",
      whisky: existing,
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
