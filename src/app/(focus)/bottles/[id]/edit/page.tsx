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
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/bottles/${bottle.id}`}>← 詳細へ</Link>
      </Button>

      <h1 className="font-heading text-xl font-bold">ボトルを編集</h1>
      <EditBottleForm bottle={bottle} />
    </>
  );
}
