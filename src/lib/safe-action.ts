import { createSafeActionClient } from "next-safe-action";
import { getSession } from "@/lib/session";

// 書き込みのアクションはこれで作る。所有者はセッションが正なので、userId は入力でなく ctx から渡す。
export const authActionClient = createSafeActionClient().use(
  async ({ next }) => {
    const session = await getSession();
    if (!session) throw new Error("ログインが必要です");
    return next({ ctx: { userId: session.user.id } });
  },
);
