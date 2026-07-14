import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function BottlesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">ボトル一覧</h1>
        <LogoutButton />
      </header>

      <p className="rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-gray-500">
        まだ登録がありません
      </p>

      {/* US-1 の基盤確認用（CRUD 実装時に削除）。セッションから userId が取れていることを可視化。 */}
      <p className="text-xs text-gray-400">
        ログイン中: {session.user.email}（userId: {session.user.id}）
      </p>
    </main>
  );
}
