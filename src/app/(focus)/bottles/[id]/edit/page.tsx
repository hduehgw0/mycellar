import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { getOwnedBottle } from "../get-owned-bottle";
import { EditBottleForm } from "./edit-bottle-form";

export default async function EditBottlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();

  const { id } = await params;
  const bottle = await getOwnedBottle(id, session.user.id);
  // 自分のボトルでない（他人の id・存在しない id）なら 404。
  if (!bottle) notFound();

  return (
    <>
      {/* 見出しは中央、離脱は左上（→ docs/ui-mockups/06-ボトル編集.png）。 */}
      <header className="relative flex items-center justify-center">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="absolute -left-2.5 text-muted-foreground"
        >
          <Link href={`/bottles/${bottle.id}`}>キャンセル</Link>
        </Button>
        <h1 className="font-heading text-lg font-bold">ボトル編集</h1>
      </header>

      <EditBottleForm bottle={bottle} />
    </>
  );
}
