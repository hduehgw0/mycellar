import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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
        <ul className="flex flex-col gap-2">
          {bottles.map((bottle) => {
            // 題名は業界の呼称に合わせて「名称 年数」（NAS は名称のみ）。
            const title = bottle.age
              ? `${bottle.name} ${bottle.age}年`
              : bottle.name;
            // 国・地域は中黒でつなぐテキスト（未入力は filter で落とす）。
            const meta = [bottle.region, bottle.subRegion].filter(Boolean);
            return (
              <li key={bottle.id}>
                <Link
                  href={`/bottles/${bottle.id}`}
                  className="flex flex-col gap-1 rounded-md border px-4 py-3 hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 font-medium break-words">
                      {title}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {bottle.quantity}本
                    </span>
                  </div>
                  {(meta.length > 0 || bottle.isLimited) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {meta.length > 0 && <span>{meta.join("・")}</span>}
                      {bottle.isLimited && (
                        <Badge variant="secondary">限定版</Badge>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
