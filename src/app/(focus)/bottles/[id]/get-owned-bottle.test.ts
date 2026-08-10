import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnedBottle } from "./get-owned-bottle";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { bottle: { findFirst: vi.fn() } },
}));

beforeEach(() => {
  vi.mocked(prisma.bottle.findFirst).mockReset();
});

describe("getOwnedBottle", () => {
  it("id と userId の両方で絞って取得する（他人の id は引けない＝認可）", async () => {
    await getOwnedBottle("bottle_1", "user_me");

    expect(prisma.bottle.findFirst).toHaveBeenCalledWith({
      where: { id: "bottle_1", userId: "user_me" },
    });
  });
});
