"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import type { DuplicateWhisky } from "@/lib/whiskies";

const TOAST_ID = "duplicate-whisky";

function dismissDuplicateWhiskyToast() {
  toast.dismiss(TOAST_ID);
}

// 登録・編集のどちらで重複しても、既存の製品を示して製品ページへ辿れるようにする
// （その場で本数は加算しない → docs/requirements.md「5. スコープ」保留）。
function showDuplicateWhiskyToast(whisky: DuplicateWhisky) {
  toast.info("この製品は既に登録されています", {
    id: TOAST_ID,
    closeButton: true,
    // リンクを押す前に消えないよう、時間では消さない。
    duration: Infinity,
    description: (
      <Link
        href={`/whiskies/${whisky.id}`}
        onClick={dismissDuplicateWhiskyToast}
        className="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground"
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

// 時間では消えないので、出せる画面を離れたら消す。
// 返事を待つ間に離れたときは、あとから届いた重複でも出さない。
export function useDuplicateWhiskyToast() {
  const leftRef = useRef(false);
  useEffect(() => {
    // 開発時の Strict Mode は、出す → 消す → 出す を行うので、出すたびに戻す。
    leftRef.current = false;
    return () => {
      leftRef.current = true;
      dismissDuplicateWhiskyToast();
    };
  }, []);
  return {
    show(whisky: DuplicateWhisky) {
      if (!leftRef.current) showDuplicateWhiskyToast(whisky);
    },
    dismiss: dismissDuplicateWhiskyToast,
  };
}
