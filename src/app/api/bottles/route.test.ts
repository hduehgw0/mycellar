import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import type { Whisky } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { createWhisky } from "@/lib/whiskies";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
// 保存の中身（nameKey・トランザクション・重複の判定）は whiskies.test.ts で確かめる。
// ここでは HTTP の扱い（認証・検証・ステータス・応答の形）だけを見る。
vi.mock("@/lib/whiskies", () => ({ createWhisky: vi.fn() }));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

const session = { user: { id: "user_me" } } as unknown as Session;

const existing = {
  id: "whisky_existing",
  userId: "user_me",
  name: "ラフロイグ 10年",
  nameKey: "ラフロイグ10年",
  country: "スコットランド",
  region: "アイラ",
  age: 10,
} as Whisky;

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/bottles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.mocked(getSession).mockResolvedValue(session);
  vi.mocked(createWhisky)
    .mockReset()
    .mockResolvedValue({
      status: "created",
      whisky: { id: "whisky_1" } as Whisky,
    });
});

describe("POST /api/bottles", () => {
  it("未ログインなら 401 で、保存しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await post({ name: "山崎 12年" });

    expect(response.status).toBe(401);
    expect(createWhisky).not.toHaveBeenCalled();
  });

  it("製品名が無ければ 400 で、保存しない", async () => {
    const response = await post({ name: "" });

    expect(response.status).toBe(400);
    expect(createWhisky).not.toHaveBeenCalled();
  });

  it("JSON でないボディは 400 で、保存しない", async () => {
    const response = await post("not-json");

    expect(response.status).toBe(400);
    expect(createWhisky).not.toHaveBeenCalled();
  });

  it("正常な入力なら 201 で、作った製品の id だけを返す", async () => {
    const response = await post({ name: "山崎 12年", quantity: 2 });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "whisky_1" });
    expect(createWhisky).toHaveBeenCalledWith("user_me", {
      name: "山崎 12年",
      quantity: 2,
      isLimited: false,
    });
  });

  it("同じ製品なら 409 で、重複のカードに出す項目だけを返す", async () => {
    vi.mocked(createWhisky).mockResolvedValue({
      status: "duplicate",
      whisky: existing,
    });

    const response = await post({ name: "ラフロイグ 10年" });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "この製品は既に登録されています",
      whisky: {
        id: "whisky_existing",
        name: "ラフロイグ 10年",
        country: "スコットランド",
        age: 10,
      },
    });
  });

  it("ボディで他人の userId を送っても無視される（所有者はセッションが正）", async () => {
    await post({ name: "山崎 12年", userId: "user_attacker" });

    expect(createWhisky).toHaveBeenCalledWith(
      "user_me",
      expect.not.objectContaining({ userId: expect.anything() }),
    );
  });
});
