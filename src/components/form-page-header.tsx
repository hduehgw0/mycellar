import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FormPageHeader({
  title,
  cancelHref,
}: {
  title: string;
  cancelHref: string;
}) {
  return (
    // キャンセルを absolute にするのは、その幅に関係なく見出しを画面の中央に置くため。
    // 高さを変えたら、app/layout.tsx の Toaster の offset（このヘッダーの下に出す）も合わせる。
    <header className="relative flex items-center justify-center">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="absolute -left-2.5 text-muted-foreground"
      >
        <Link href={cancelHref}>キャンセル</Link>
      </Button>
      <h1 className="font-heading text-lg font-bold">{title}</h1>
    </header>
  );
}
