import { createSafeActionClient, returnServerError } from "next-safe-action";
import { getSession } from "@/lib/session";

// 書き込みのアクションはこれで作る。所有者はセッションが正なので、userId は入力でなく ctx から渡す。
export const authActionClient = createSafeActionClient().use(
  async ({ next }) => {
    const session = await getSession();
    // throw すると想定外の例外としてログに出る。セッション切れは想定内なので、ログに出さずに返す。
    if (!session) returnServerError("ログインが必要です");
    return next({ ctx: { userId: session.user.id } });
  },
);
