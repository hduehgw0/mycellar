import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import { DeleteBottleDialog } from "./delete-bottle-dialog";
import { getOwnedBottle } from "./get-owned-bottle";

export default async function BottleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();

  const { id } = await params;
  const bottle = await getOwnedBottle(id, session.user.id);
  // 自分のボトルでない（他人の id・存在しない id）なら 404。
  if (!bottle) notFound();

  // 題名は一覧と同じく「名称 年数」（NAS は名称のみ）。h1 と削除ダイアログで共用する。
  const title = bottle.age ? `${bottle.name} ${bottle.age}年` : bottle.name;

  // 未入力の任意項目も行だけは出す（→ #66）。値が空でも「何を登録できるか」が分かる。
  const details = [
    { label: "産地", value: bottle.region },
    { label: "地域", value: bottle.subRegion },
    { label: "年数", value: bottle.age ? `${bottle.age}年` : null },
    { label: "樽", value: bottle.caskType },
    { label: "本数", value: `${bottle.quantity}本` },
  ];

  return (
    // 余白はレイアウト（gap-6）ではなくこの画面で決める。写真から削除までを 1 つの流れとして
    // 詰めたいので、1 枚にまとめて自前の間隔を張る。
    <div className="flex flex-col gap-5">
      {/* 写真の場所。アップロードはフェーズ 4 なので、今は全ボトルがこの絵になる。
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
          {bottle.isLimited && <Badge>限定版</Badge>}
        </div>
      </div>

      <h1 className="font-heading text-3xl font-bold">{title}</h1>

      <dl className="flex flex-col gap-3.5">
        <div className="divide-y rounded-lg border bg-card px-4">
          {details.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 py-3.5"
            >
              <dt className="shrink-0 text-sm text-muted-foreground">
                {label}
              </dt>
              <dd className="min-w-0 text-right text-sm font-medium break-words">
                {value}
              </dd>
            </div>
          ))}
        </div>

        {/* メモだけ複数行になるので、上の表には入れず自分の枠を持つ。 */}
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <dt className="text-xs text-muted-foreground">メモ</dt>
          <dd className="text-sm leading-6 break-words whitespace-pre-wrap">
            {bottle.note}
          </dd>
        </div>
      </dl>

      {/* 枠だけのボタン。outline は枠が薄く塗りも付くので ghost に枠を足す。 */}
      <Button asChild variant="ghost" className="h-12 border-foreground/30">
        <Link href={`/bottles/${bottle.id}/edit`}>編集する</Link>
      </Button>

      <Separator />

      <DeleteBottleDialog bottleId={bottle.id} displayName={title} />
    </div>
  );
}
