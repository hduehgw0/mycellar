import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // 表示する項目。値が無い任意項目（null）は除外して省略する。
  const details = [
    { label: "国", value: bottle.region },
    { label: "地域", value: bottle.subRegion },
    { label: "年数", value: bottle.age ? `${bottle.age}年` : null },
    { label: "樽", value: bottle.caskType },
    { label: "本数", value: `${bottle.quantity}本` },
    { label: "メモ", value: bottle.note },
  ].filter((d): d is { label: string; value: string } => Boolean(d.value));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/bottles">← 一覧へ</Link>
      </Button>

      <header className="flex items-center gap-2">
        {/* 題名は一覧と同じく「名称 年数」（NAS は名称のみ）。年数の詳細は下の dl にも出す。 */}
        <h1 className="text-xl font-bold">
          {bottle.age ? `${bottle.name} ${bottle.age}年` : bottle.name}
        </h1>
        {bottle.isLimited && <Badge variant="secondary">限定版</Badge>}
      </header>

      <dl className="flex flex-col gap-3">
        {details.map(({ label, value }) => (
          <div key={label} className="flex gap-4">
            <dt className="w-16 shrink-0 text-sm text-muted-foreground">
              {label}
            </dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <Button asChild className="w-fit">
        <Link href={`/bottles/${bottle.id}/edit`}>編集する</Link>
      </Button>
    </main>
  );
}
