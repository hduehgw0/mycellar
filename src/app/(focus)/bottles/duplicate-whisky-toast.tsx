"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import type { DuplicateWhisky } from "@/lib/whiskies";

const TOAST_ID = "duplicate-whisky";

const TOAST_DURATION_MS = 6_000;

export function dismissDuplicateWhiskyToast() {
  toast.dismiss(TOAST_ID);
}

// 登録・編集のどちらで重複しても、既存の製品を示して製品ページへ辿れるようにする
// （その場で本数は加算しない → docs/requirements.md「5. スコープ」保留）。
export function showDuplicateWhiskyToast(whisky: DuplicateWhisky) {
  toast.info("この製品は既に登録されています", {
    id: TOAST_ID,
    closeButton: true,
    duration: TOAST_DURATION_MS,
    classNames: {
      // sonner の CSS は属性セレクタで詳細度が高いので、上書きには ! が要る。
      // 既定はアイコンを上下中央に置くので、カードを含む高さの真ん中に来る。見出しの行に揃える。
      toast: "items-start!",
      // 本文の枠は中身の幅まで広がるので、長い製品名がトーストからはみ出す。枠を残りの幅に収めて省略させる。
      content: "min-w-0 flex-1 gap-3!",
    },
    description: (
      <Link
        href={`/bottles/${whisky.id}`}
        onClick={dismissDuplicateWhiskyToast}
        className="mr-6 flex items-center gap-3 rounded-lg border bg-card p-3 text-foreground"
      >
        <BottlePlaceholder className="h-10 w-auto shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">{whisky.name}</span>
          <span className="truncate text-xs text-muted-foreground empty:hidden">
            {[whisky.country, whisky.age !== null && `${whisky.age}年`]
              .filter(Boolean)
              .join("・")}
          </span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    ),
  });
}
