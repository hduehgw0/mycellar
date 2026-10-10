import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CreateWhiskyForm } from "./create-whisky-form";

export const metadata: Metadata = { title: "製品登録" };

export default async function NewWhiskyPage() {
  await requireSession();

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
          <Link href="/bottles">キャンセル</Link>
        </Button>
        <h1 className="font-heading text-lg font-bold">製品登録</h1>
      </header>

      <CreateWhiskyForm />
    </>
  );
}
