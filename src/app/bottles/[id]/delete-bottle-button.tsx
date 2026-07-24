"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
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

// 削除ボタン＋確認ダイアログ（クライアント）。詳細ページ（Server Component）から分離。
// 認可・実削除はサーバ（DELETE /api/bottles/[id] の where:{id,userId}）が担い、ここは UI と送信のみ。
export function DeleteBottleButton({
  bottleId,
  displayName,
}: {
  bottleId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bottles/${bottleId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        // 想定内の失敗（401/404 等）はダイアログを開いたまま文言のみ表示。
        setError("削除に失敗しました。もう一度お試しください。");
        return;
      }
      // 一覧は Server Component キャッシュのため、遷移＋refresh で削除を反映する。
      router.push("/bottles");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("削除に失敗しました。もう一度お試しください。");
    } finally {
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
        <Button variant="destructive" className="w-fit">
          削除する
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>このボトルを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{displayName}」を一覧から削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {/*
          フッターは flex-col-reverse なので DOM 順（キャンセル→削除）で
          モバイルは「削除する」が上に来る。既定フォーカスは先頭 = キャンセル
          （破壊的操作に初期フォーカスを当てない）。
          非同期削除は AlertDialogAction（クリックで即クローズ）ではなく
          通常の Button で制御し、失敗時はダイアログを保持する。
        */}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
          <Button
            variant="destructive"
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
