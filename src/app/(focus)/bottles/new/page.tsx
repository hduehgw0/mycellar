import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CreateBottleForm } from "./create-bottle-form";

export default async function NewBottlePage() {
  await requireSession();

  return (
    <>
      {/* タブバーが出ない画面なので戻る導線を置く。直接開かれても効くよう Link にする
          （history.back() だと履歴の無い人が詰む → #59）。 */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/bottles">← 一覧へ</Link>
      </Button>

      <h1 className="font-heading text-xl font-bold">ボトルを登録</h1>
      <CreateBottleForm />
    </>
  );
}
