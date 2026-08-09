"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// 並びは正本どおり。「登録」（action）はタブではなくアクションで、行き先はタブバーを
// 出さない画面のため現在地を持たない。常時アンバー・非太字で他と区別する。
const ITEMS = [
  { href: "/bottles", label: "コレクション", Icon: GridIcon },
  { href: "/stats", label: "傾向", Icon: BarsIcon },
  { href: "/bottles/new", label: "登録", Icon: PlusIcon, action: true },
  { href: "/account", label: "アカウント", Icon: PersonIcon },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* バーの上で内容を背景に溶かすスクリム。バーより下に敷く。 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[150px] bg-gradient-to-t from-background from-40% to-transparent"
      />
      <nav
        aria-label="メインナビゲーション"
        // 高さ 82px は正本の値。実機のホームインジケータ分はその下に足す
        // （env() を効かせるにはルートの viewport-fit=cover が要る → src/app/layout.tsx）。
        className="fixed inset-x-0 bottom-0 z-20 flex h-[82px] items-start justify-around border-t border-border bg-background/90 px-[22px] pt-3.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px]"
      >
        {ITEMS.map(({ href, label, Icon, action }) => {
          // 前方一致は不要：タブの行き先は 3 つとも (sections) 直下で、そこから押し込んだ
          // 画面は (focus) 側なのでタブバーごと出ない。
          const current = !action && pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-w-[58px] flex-col items-center gap-1.5",
                current || action ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="flex h-[26px] items-center">
                <Icon />
              </span>
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

// アイコンは正本と同じく塗りの図形。lucide は線画で見た目が変わるため使わない。
// 寸法は正本の値をそのまま写している。

function GridIcon() {
  return (
    <span className="grid w-[19px] grid-cols-2 gap-[2.5px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="size-2 rounded-[2px] bg-current" />
      ))}
    </span>
  );
}

function BarsIcon() {
  return (
    <span className="flex items-end gap-[2.5px]" aria-hidden>
      {[9, 17, 13].map((h) => (
        <span
          key={h}
          style={{ height: h }}
          className="w-1 rounded-[1px] bg-current"
        />
      ))}
    </span>
  );
}

function PlusIcon() {
  return (
    <span
      aria-hidden
      className="flex size-[26px] items-center justify-center rounded-full border-[1.8px] border-current text-[19px] leading-none"
    >
      +
    </span>
  );
}

function PersonIcon() {
  return (
    <span className="flex flex-col items-center" aria-hidden>
      <span className="size-2 rounded-full bg-current" />
      {/* 角丸は 8px 固定。rounded-t-lg は --radius（1rem）を参照してしまう。 */}
      <span className="mt-[2px] h-2 w-[15px] rounded-t-[8px] bg-current" />
    </span>
  );
}
