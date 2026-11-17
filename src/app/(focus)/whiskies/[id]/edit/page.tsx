import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getOwnedWhisky } from "@/features/whisky/queries";
import type { WhiskyFormInput } from "@/features/whisky/schema";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader title="製品編集" cancelHref={`/whiskies/${whisky.id}`} />

      <EditWhiskyForm
        id={whisky.id}
        defaultValues={{
          name: whisky.name,
          // DB の列は string だが、入る値は登録・編集の検証で固定リストに限られる。
          country: whisky.country as WhiskyFormInput["country"],
          region: whisky.region as WhiskyFormInput["region"],
          age: whisky.age,
          isNas: whisky.isNas,
          caskType: whisky.caskType as WhiskyFormInput["caskType"],
          isLimited: whisky.isLimited,
          quantity: whisky._count.bottles,
          memo: whisky.memo,
        }}
      />
    </>
  );
}
