"use client";

import { useRouter } from "next/navigation";
import type { WhiskyFormInput } from "@/features/whisky/schema";
import { updateWhiskyAction } from "@/features/whisky/actions";
import { WhiskyForm } from "@/features/whisky/components/whisky-form";
import { useDuplicateWhiskyToast } from "@/features/whisky/components/duplicate-whisky-toast";

// 編集用ラッパー：共有フォームに既存値・文言・送信処理を渡す。
export function EditWhiskyForm({
  id,
  defaultValues,
}: {
  id: string;
  defaultValues: WhiskyFormInput;
}) {
  const router = useRouter();
  const duplicateToast = useDuplicateWhiskyToast();
  return (
    <WhiskyForm
      defaultValues={defaultValues}
      submitLabel="変更を保存"
      submittingLabel="保存中…"
      errorLabel="保存に失敗しました。もう一度お試しください。"
      onSubmit={async (data) => {
        duplicateToast.dismiss();
        // アクションは部分更新だが、フォームの全項目を送る（国と地域はいつも組で届く）。
        const result = (await updateWhiskyAction(id, data)).data;
        // 重複は製品ページへ戻らず、衝突した既存の製品を示して入力内容を残す。
        if (result?.status === "duplicate") {
          duplicateToast.show(result.whisky);
          return;
        }
        if (result?.status !== "updated") return "failed";
        router.push(`/whiskies/${id}`);
      }}
    />
  );
}
