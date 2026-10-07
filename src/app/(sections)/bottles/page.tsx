import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { countBottles } from "@/lib/collection-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import { EmptyCollection } from "@/components/illustrations/empty-collection";

export const metadata: Metadata = { title: "コレクション" };

export default async function WhiskiesPage() {
  const session = await requireSession();

  const whiskies = await prisma.whisky.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      age: true,
      isLimited: true,
      _count: { select: { bottles: true } },
    },
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">コレクション</h1>
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <p>{countBottles(whiskies)}本</p>
          {/* 並べ替えはフェーズ 4。今の並び順を示すだけの表示で、操作はできない。 */}
          {whiskies.length > 0 && <p>新しい順</p>}
        </div>
      </div>

      {whiskies.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <EmptyCollection className="h-48" />
          <div className="flex flex-col gap-2">
            <p className="font-heading text-xl font-bold">
              まだ登録がありません
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              まずは製品を登録し、
              <br />
              コレクションを開始しましょう。
            </p>
          </div>
          <Button asChild className="h-14 px-6 text-base">
            <Link href="/bottles/new">
              <Plus />
              製品を登録
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5">
          {whiskies.map((whisky) => (
            <li key={whisky.id}>
              <Link
                href={`/bottles/${whisky.id}`}
                className="relative flex h-full flex-col rounded-lg border bg-linear-to-b from-muted to-card hover:border-ring"
              >
                <div className="flex flex-1 items-center justify-center p-3.5">
                  <BottlePlaceholder className="h-26" />
                </div>
                <div className="flex flex-col gap-0.5 p-3">
                  <span className="line-clamp-2 text-sm font-medium break-words">
                    {whisky.name}
                  </span>
                  <span className="text-xs text-muted-foreground empty:hidden">
                    {[
                      whisky.country,
                      whisky.region,
                      whisky.age !== null && `${whisky.age}年`,
                    ]
                      .filter(Boolean)
                      .join("・")}
                  </span>
                </div>
                {whisky.isLimited && (
                  <Badge className="absolute top-2 left-2">限定版</Badge>
                )}
                {whisky._count.bottles > 1 && (
                  <Badge className="absolute top-2 right-2 bg-background text-foreground">
                    ×{whisky._count.bottles}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
