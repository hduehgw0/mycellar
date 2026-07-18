import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { bottle: { create: vi.fn() } } }));

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type Bottle = Awaited<ReturnType<typeof prisma.bottle.create>>;

const session = { user: { id: "user_me" } } as unknown as Session;

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
  vi.mocked(prisma.bottle.create)
    .mockReset()
    .mockResolvedValue({ id: "bottle_1" } as unknown as Bottle);
});

describe("POST /api/bottles", () => {
  it("未ログインなら 401 で、保存しない", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await post({ name: "山崎" });

    expect(response.status).toBe(401);
    expect(prisma.bottle.create).not.toHaveBeenCalled();
  });

  it("銘柄名が無ければ 400 で、保存しない", async () => {
    const response = await post({ name: "" });

    expect(response.status).toBe(400);
    expect(prisma.bottle.create).not.toHaveBeenCalled();
  });

  it("JSON でないボディは 400 で、保存しない", async () => {
    const response = await post("not-json");

    expect(response.status).toBe(400);
    expect(prisma.bottle.create).not.toHaveBeenCalled();
  });

  it("正常な入力なら 201 で、ログインユーザーのデータとして保存する", async () => {
    const response = await post({ name: "山崎", quantity: 2 });

    expect(response.status).toBe(201);
    expect(prisma.bottle.create).toHaveBeenCalledWith({
      data: {
        name: "山崎",
        quantity: 2,
        isLimited: false,
        userId: "user_me",
      },
    });
  });

  it("ボディで他人の userId を送っても無視される（所有者はセッションが正）", async () => {
    await post({ name: "山崎", userId: "user_attacker" });

    expect(prisma.bottle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user_me" }),
    });
  });
});
