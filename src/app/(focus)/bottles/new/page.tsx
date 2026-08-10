import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CreateBottleForm } from "./create-bottle-form";

export default async function NewBottlePage() {
  await requireSession();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/bottles">← 一覧へ</Link>
      </Button>

      <h1 className="font-heading text-xl font-bold">ボトルを登録</h1>
      <CreateBottleForm />
    </>
  );
}
