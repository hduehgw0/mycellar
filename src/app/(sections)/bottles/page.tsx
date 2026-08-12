import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import { EmptyCollection } from "@/components/illustrations/empty-collection";

export default async function BottlesPage() {
  const session = await requireSession();

  const bottles = await prisma.bottle.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // 「〜本」は持っている本数。同じ銘柄を複数持てるので、件数ではなく quantity の合計。
  const total = bottles.reduce((sum, bottle) => sum + bottle.quantity, 0);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">コレクション</h1>
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <p>{total}本</p>
          {/* 並べ替えはフェーズ 4。今の並び順を示すだけの表示で、操作はできない。 */}
          {bottles.length > 0 && <p>新しい順</p>}
        </div>
      </div>

      {bottles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <EmptyCollection className="h-48" />
          <div className="flex flex-col gap-2">
            <p className="font-heading text-xl font-bold">
              まだ登録がありません
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              最初の一本を登録して、
              <br />
              コレクションを始めましょう。
            </p>
          </div>
          <Button asChild className="h-14 px-6 text-base">
            <Link href="/bottles/new">
              <Plus />
              最初のボトルを登録
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5">
          {bottles.map((bottle) => {
            // 題名は業界の呼称に合わせて「名称 年数」（NAS は名称のみ）。
            const title = bottle.age
              ? `${bottle.name} ${bottle.age}年`
              : bottle.name;
            return (
              <li key={bottle.id}>
                <Link
                  href={`/bottles/${bottle.id}`}
                  className="relative flex h-full flex-col rounded-lg border bg-linear-to-b from-muted to-card hover:border-ring"
                >
                  <div className="flex flex-1 items-center justify-center p-3.5">
                    <BottlePlaceholder className="h-26" />
                  </div>
                  <div className="flex flex-col gap-0.5 p-3">
                    <span className="text-sm font-medium break-words">
                      {title}
                    </span>
                    {bottle.region && (
                      <span className="text-xs text-muted-foreground">
                        {bottle.region}
                      </span>
                    )}
                  </div>
                  {bottle.isLimited && (
                    <Badge className="absolute top-2 left-2">限定版</Badge>
                  )}
                  {bottle.quantity > 1 && (
                    <Badge className="absolute top-2 right-2 bg-background text-foreground">
                      ×{bottle.quantity}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
