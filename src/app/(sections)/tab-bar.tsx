"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  CirclePlus,
  LayoutGrid,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 並びは正本どおり。「登録」（action）はタブではなくアクションで、行き先はタブバーを
// 出さない画面のため現在地を持たない。常時アンバー・非太字で他と区別する。
const ITEMS = [
  { href: "/bottles", label: "コレクション", Icon: LayoutGrid },
  { href: "/stats", label: "傾向", Icon: ChartNoAxesColumn },
  { href: "/bottles/new", label: "登録", Icon: CirclePlus, action: true },
  { href: "/account", label: "アカウント", Icon: UserRound },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* バーの上で内容を背景に溶かすスクリム。バーより下に敷く。 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-36 bg-linear-to-t from-background from-40% to-transparent"
      />
      <nav
        aria-label="メインナビゲーション"
        // env() を効かせるにはルートの viewport-fit=cover が要る（→ src/app/layout.tsx）。
        className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(var(--spacing-tab-bar)+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-background/90 px-6 pt-3.5 backdrop-blur-md"
      >
        {ITEMS.map(({ href, label, Icon, action }) => {
          const current = !action && pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5",
                current || action ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-6" />
              {/* 10px は Tailwind の目盛りに無い。text-xs（12px）だとラベルが 4 等分の枠に収まらない。 */}
              <span className={cn("text-[10px]", current && "font-bold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
