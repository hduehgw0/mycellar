import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWhiskyAction,
  deleteWhiskyAction,
  updateWhiskyAction,
} from "./actions";
import { getSession } from "@/lib/session";
import {
  createWhisky,
  deleteWhisky,
  updateWhisky,
} from "@/features/whisky/mutations";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
// 保存の中身（nameKey・部分更新・ロック・重複の判定・削除）は mutations.db.test.ts で確かめる。
// ここではアクションの入口（ログインの確認・検証・所有者・結果の形）だけを見る。
vi.mock("@/features/whisky/mutations", () => ({
  createWhisky: vi.fn(),
  updateWhisky: vi.fn(),
  deleteWhisky: vi.fn(),
}));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

const session = { user: { id: "user_me" } } as unknown as Session;

const existing = {
  id: "whisky_existing",
  name: "ラフロイグ 10年",
  country: "スコットランド",
  age: 10,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(getSession).mockResolvedValue(session);
  vi.mocked(createWhisky)
    .mockReset()
    .mockResolvedValue({ status: "created", id: "whisky_1" });
  vi.mocked(updateWhisky).mockReset().mockResolvedValue({ status: "updated" });
  vi.mocked(deleteWhisky).mockReset().mockResolvedValue({ status: "deleted" });
});

function logout() {
  vi.mocked(getSession).mockResolvedValue(null);
  // next-safe-action が例外をログに出すので、テストの出力を汚さないよう黙らせる。
  vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("createWhiskyAction", () => {
  it("未ログインなら失敗で、保存しない", async () => {
    logout();

    const result = await createWhiskyAction({ name: "山崎 12年" });

    expect(result.serverError).toBeDefined();
    expect(createWhisky).not.toHaveBeenCalled();
  });

  it("製品名が無ければ検証の失敗で、保存しない", async () => {
    const result = await createWhiskyAction({ name: "" });

    expect(result.validationErrors).toBeDefined();
    expect(createWhisky).not.toHaveBeenCalled();
  });

  it("正常な入力なら、作った製品の id を返す", async () => {
    const result = await createWhiskyAction({ name: "山崎 12年", quantity: 2 });

    expect(result.data).toEqual({ status: "created", id: "whisky_1" });
    expect(createWhisky).toHaveBeenCalledWith("user_me", {
      name: "山崎 12年",
      quantity: 2,
      isLimited: false,
    });
  });

  it("同じ製品なら、既存の製品を返す", async () => {
    vi.mocked(createWhisky).mockResolvedValue({
      status: "duplicate",
      whisky: existing,
    });

    const result = await createWhiskyAction({ name: "ラフロイグ 10年" });

    expect(result.data).toEqual({ status: "duplicate", whisky: existing });
  });

  it("他人の userId を送っても無視される（所有者はセッションが正）", async () => {
    await createWhiskyAction({
      name: "山崎 12年",
      userId: "user_attacker",
    } as Parameters<typeof createWhiskyAction>[0]);

    expect(createWhisky).toHaveBeenCalledWith(
      "user_me",
      expect.not.objectContaining({ userId: expect.anything() }),
    );
  });
});

describe("updateWhiskyAction", () => {
  it("未ログインなら失敗で、更新しない", async () => {
    logout();

    const result = await updateWhiskyAction("whisky_1", { age: 12 });

    expect(result.serverError).toBeDefined();
    expect(updateWhisky).not.toHaveBeenCalled();
  });

  it("送った製品名が空なら検証の失敗で、更新しない", async () => {
    const result = await updateWhiskyAction("whisky_1", { name: "" });

    expect(result.validationErrors).toBeDefined();
    expect(updateWhisky).not.toHaveBeenCalled();
  });

  // 部分更新：送っていない項目を既定値で埋めると、その項目を上書きしてしまう。
  it("一部の項目だけを送ると、送った項目だけを自分の製品の更新に渡す", async () => {
    const result = await updateWhiskyAction("whisky_1", { age: 12 });

    expect(result.data).toEqual({ status: "updated" });
    expect(updateWhisky).toHaveBeenCalledWith("user_me", "whisky_1", {
      age: 12,
    });
  });

  it("任意項目を null や空欄で送ると、値を消す（null を渡す）", async () => {
    await updateWhiskyAction("whisky_1", { age: null, memo: "" });

    expect(updateWhisky).toHaveBeenCalledWith("user_me", "whisky_1", {
      age: null,
      memo: null,
    });
  });

  it("他人の/存在しない id は notFound を返す", async () => {
    vi.mocked(updateWhisky).mockResolvedValue({ status: "notFound" });

    const result = await updateWhiskyAction("whisky_other", { age: 12 });

    expect(result.data).toEqual({ status: "notFound" });
  });

  it("製品名を変えて別の製品と重なると、既存の製品を返す", async () => {
    vi.mocked(updateWhisky).mockResolvedValue({
      status: "duplicate",
      whisky: existing,
    });

    const result = await updateWhiskyAction("whisky_1", {
      name: "ラフロイグ 10年",
    });

    expect(result.data).toEqual({ status: "duplicate", whisky: existing });
  });
});

describe("deleteWhiskyAction", () => {
  it("未ログインなら失敗で、削除しない", async () => {
    logout();

    const result = await deleteWhiskyAction("whisky_1");

    expect(result.serverError).toBeDefined();
    expect(deleteWhisky).not.toHaveBeenCalled();
  });

  it("他人の/存在しない id は notFound を返す", async () => {
    vi.mocked(deleteWhisky).mockResolvedValue({ status: "notFound" });

    const result = await deleteWhiskyAction("whisky_other");

    expect(result.data).toEqual({ status: "notFound" });
  });

  it("自分の製品なら、自分の製品の削除に渡す", async () => {
    const result = await deleteWhiskyAction("whisky_1");

    expect(result.data).toEqual({ status: "deleted" });
    expect(deleteWhisky).toHaveBeenCalledWith("user_me", "whisky_1");
  });
});
