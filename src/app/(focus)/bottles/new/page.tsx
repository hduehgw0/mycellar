import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CreateBottleForm } from "./create-bottle-form";

export default async function NewBottlePage() {
  await requireSession();

  return (
    <>
      {/* 見出しは中央、離脱は左上（→ docs/ui-mockups/05-ボトル登録.png）。 */}
      <header className="relative flex items-center justify-center">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="absolute -left-2.5 text-muted-foreground"
        >
          <Link href="/bottles">キャンセル</Link>
        </Button>
        <h1 className="font-heading text-lg font-bold">ボトル登録</h1>
      </header>

      <CreateBottleForm />
    </>
  );
}
