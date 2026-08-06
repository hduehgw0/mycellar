"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { BottlePlaceholder } from "@/components/illustrations/bottle-placeholder";
import { Badge } from "@/components/ui/badge";
import type { Bottle } from "@/generated/prisma/client";

// 409 のレスポンスはボトル行をそのまま返す。ここで使う分だけを取る。
type ExistingBottle = Pick<
  Bottle,
  "id" | "name" | "age" | "caskType" | "isLimited"
>;

const TOAST_ID = "duplicate-bottle";

const TOAST_DURATION_MS = 6_000;

export function dismissDuplicateBottleToast() {
  toast.dismiss(TOAST_ID);
}

// 登録・編集のどちらで重複しても、既存のボトルを示して詳細へ辿れるようにする
// （その場で本数は加算しない → docs/requirements.md「5. スコープ」保留）。
export function showDuplicateBottleToast(bottle: ExistingBottle) {
  toast.info("このボトルは既に登録されています", {
    id: TOAST_ID,
    closeButton: true,
    duration: TOAST_DURATION_MS,
    description: (
      <Link
        href={`/bottles/${bottle.id}`}
        onClick={dismissDuplicateBottleToast}
        className="flex items-center gap-3 rounded-lg bg-muted p-3 text-foreground"
      >
        <BottlePlaceholder className="h-10 w-auto shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">
              {bottle.name}
              {bottle.age != null && ` ${bottle.age}年`}
            </span>
            {bottle.isLimited && <Badge>限定版</Badge>}
          </span>
          {bottle.caskType && (
            <span className="truncate text-muted-foreground">
              {bottle.caskType}
            </span>
          )}
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    ),
  });
}
