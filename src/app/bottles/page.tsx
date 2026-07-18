import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";

export default async function BottlesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const bottles = await prisma.bottle.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">ボトル一覧</h1>
        <LogoutButton />
      </header>

      <Button asChild>
        <Link href="/bottles/new">ボトルを登録</Link>
      </Button>

      {bottles.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-gray-500">
          まだ登録がありません
        </p>
      ) : (
        // 登録反映の確認用の最小表示（一覧の本実装は #26）。
        <ul className="flex flex-col gap-2">
          {bottles.map((bottle) => (
            <li key={bottle.id} className="rounded-md border px-4 py-3">
              {bottle.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
