import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getOwnedWhisky } from "@/lib/whiskies";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import { DeleteBottleDialog } from "./delete-bottle-dialog";

export const metadata: Metadata = { title: "製品" };

export default async function WhiskyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();

  const { id } = await params;
  const whisky = await getOwnedWhisky(session.user.id, id);
  // 自分の製品でない（他人の id・存在しない id）なら 404。
  if (!whisky) notFound();

  // 未入力の任意項目も行だけは出す。
  const details = [
    { label: "国", value: whisky.country },
    { label: "地域", value: whisky.region },
    { label: "年数", value: whisky.age !== null ? `${whisky.age}年` : null },
    { label: "樽", value: whisky.caskType },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* 写真の場所。アップロードはフェーズ 4 なので、今は全製品がこの絵になる。
          負の余白は (focus)/layout.tsx の px-6 py-10 の打ち消し。端まで見せるため。 */}
      <div className="relative -mx-6 -mt-10 flex h-70 items-center justify-center bg-linear-to-b from-primary/20 to-primary/5">
        <BottlePlaceholder className="h-57" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 rounded-full bg-background/60 hover:bg-background/80"
          >
            <Link href="/bottles" aria-label="一覧へ戻る">
              <ChevronLeftIcon className="size-5" />
            </Link>
          </Button>
          {whisky.isLimited && <Badge>限定版</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{whisky.name}</h1>
        <p className="text-sm text-muted-foreground">
          {whisky._count.bottles}本を所有
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <dl className="divide-y rounded-lg border bg-card px-4">
          {details.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 py-3.5"
            >
              <dt className="shrink-0 text-sm text-muted-foreground">
                {label}
              </dt>
              <dd
                className={cn(
                  "min-w-0 text-right text-sm font-medium break-words",
                  value === null && "text-muted-foreground",
                )}
              >
                {value ?? "-"}
              </dd>
            </div>
          ))}
        </dl>

        {/* メモだけ複数行になるので、上の表には入れず自分の枠を持つ。 */}
        <dl className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <dt className="text-xs text-muted-foreground">メモ</dt>
          <dd
            className={cn(
              "text-sm leading-6 break-words whitespace-pre-wrap",
              whisky.memo === null && "text-muted-foreground",
            )}
          >
            {whisky.memo ?? "-"}
          </dd>
        </dl>
      </div>

      {/* 枠だけのボタン。outline は枠が薄く塗りも付くので ghost に枠を足す。 */}
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="border-foreground/30"
      >
        <Link href={`/bottles/${whisky.id}/edit`}>編集する</Link>
      </Button>

      <Separator />

      <DeleteBottleDialog bottleId={whisky.id} bottleTitle={whisky.name} />
    </div>
  );
}
