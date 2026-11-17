import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  cancelHref,
}: {
  title: string;
  cancelHref: string;
}) {
  return (
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
