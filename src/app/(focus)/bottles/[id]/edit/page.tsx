import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getOwnedWhisky } from "@/lib/whiskies";
import type { WhiskyFormInput } from "@/lib/schemas/whisky";
import { Button } from "@/components/ui/button";
import { EditWhiskyForm } from "./edit-whisky-form";

export const metadata: Metadata = { title: "製品編集" };

export default async function EditWhiskyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();

  const { id } = await params;
  const whisky = await getOwnedWhisky(session.user.id, id);
  // 自分の製品でない（他人の id・存在しない id）なら 404。
  if (!whisky) notFound();

  return (
    <>
      {/* 見出しは中央、離脱は左上。 */}
      <header className="relative flex items-center justify-center">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="absolute -left-2.5 text-muted-foreground"
        >
          <Link href={`/bottles/${whisky.id}`}>キャンセル</Link>
        </Button>
        <h1 className="font-heading text-lg font-bold">製品編集</h1>
      </header>

      <EditWhiskyForm
        id={whisky.id}
        defaultValues={{
          name: whisky.name,
          // DB の列は string だが、入る値は登録・編集の検証で固定リストに限られる。
          country: whisky.country as WhiskyFormInput["country"],
          region: whisky.region as WhiskyFormInput["region"],
          age: whisky.age,
          caskType: whisky.caskType as WhiskyFormInput["caskType"],
          isLimited: whisky.isLimited,
          quantity: whisky._count.bottles,
          memo: whisky.memo,
        }}
      />
    </>
  );
}
