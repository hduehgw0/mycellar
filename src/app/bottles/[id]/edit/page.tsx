import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-bold">ボトルを編集</h1>
      <EditBottleForm bottle={bottle} />
    </main>
  );
}
