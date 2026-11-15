"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { deleteWhiskyAction } from "@/features/whisky/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DELETE_ERROR = "削除に失敗しました。もう一度お試しください。";

export function DeleteWhiskyDialog({ whiskyId }: { whiskyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      const result = (await deleteWhiskyAction(whiskyId)).data;
      if (result?.status !== "deleted") {
        setError(DELETE_ERROR);
        setIsDeleting(false);
        return;
      }
      // 成功：この後の遷移でアンマウントされるため isDeleting は戻さない
      // （戻すと遷移前の一瞬ボタンが再有効化され、二重に削除して失敗の文言が出る）。
      // await の直後にすぐ移る。あいだで待つと、アクションの refresh() で作り直した
      // 消したページ（「見つかりません」）が一瞬見える。
      router.push("/whiskies");
    } catch (e) {
      console.error(e);
      setError(DELETE_ERROR);
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          // dark: 付きの方が詳細度が高く、ghost の dark:hover:bg-muted/50 に負ける。
          // dark 固定（layout.tsx）なので dark: 側も上書きしないとホバーが灰色のままになる。
          className="text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/10"
        >
          この製品を削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        // 削除中は Escape での閉じも抑止（Cancel の disabled と揃える。
        // 削除は中断されないため、閉じられると「キャンセルした錯覚」になる）。
        onEscapeKeyDown={(e) => {
          if (isDeleting) e.preventDefault();
        }}
      >
        <AlertDialogHeader className="gap-4">
          {/* 既定の bg-muted は popover とほぼ同色で枠が見えない。赤みを敷いて分ける。 */}
          <AlertDialogMedia className="size-14 rounded-lg bg-destructive/15">
            <Trash2Icon className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-xl">
            この製品を削除しますか？
          </AlertDialogTitle>
          <AlertDialogDescription>
            所有しているボトルの記録も削除されます。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {/*
          DOM 順はキャンセル→削除のまま：初期フォーカスを破壊的操作に当てない
          （モバイルでは flex-col-reverse で「削除する」が上に来る）。
          AlertDialogAction は押すとすぐ閉じるので使わない（失敗したら開いたままにする）。
        */}
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" disabled={isDeleting}>
            キャンセル
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中…" : "削除する"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
