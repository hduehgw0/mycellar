"use client";

import { useRouter } from "next/navigation";
import type { WhiskyFormInput } from "@/lib/schemas/whisky";
import { WhiskyForm } from "../../whisky-form";
import {
  dismissDuplicateWhiskyToast,
  showDuplicateWhiskyToast,
} from "../../duplicate-whisky-toast";

// 編集用ラッパー：共有フォームに既存値・文言・送信処理（PATCH）を渡す。
export function EditWhiskyForm({
  id,
  defaultValues,
}: {
  id: string;
  defaultValues: WhiskyFormInput;
}) {
  const router = useRouter();
  return (
    <WhiskyForm
      defaultValues={defaultValues}
      submitLabel="変更を保存"
      submittingLabel="保存中…"
      errorLabel="保存に失敗しました。もう一度お試しください。"
      onSubmit={async (data) => {
        dismissDuplicateWhiskyToast();
        // API は部分更新だが、フォームの全項目を送る（国と地域はいつも組で届く）。
        const response = await fetch(`/api/bottles/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        // 重複は製品ページへ戻らず、衝突した既存の製品を示して入力内容を残す。
        if (response.status === 409) {
          const { whisky } = await response.json();
          showDuplicateWhiskyToast(whisky);
          return;
        }
        if (!response.ok) return "failed";
        router.push(`/bottles/${id}`);
        router.refresh();
      }}
    />
  );
}
