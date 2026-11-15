"use client";

import { useRouter } from "next/navigation";
import { createWhiskyAction } from "@/features/whisky/actions";
import { WhiskyForm } from "@/features/whisky/components/whisky-form";
import { useDuplicateWhiskyToast } from "@/features/whisky/components/duplicate-whisky-toast";

// 登録用ラッパー：共有フォームに初期値・文言・送信処理を渡す。
export function CreateWhiskyForm() {
  const router = useRouter();
  const duplicateToast = useDuplicateWhiskyToast();
  return (
    <WhiskyForm
      defaultValues={{
        name: "",
        country: null,
        region: null,
        age: null,
        caskType: null,
        isLimited: false,
        quantity: 1,
        memo: null,
      }}
      submitLabel="この内容で登録"
      submittingLabel="登録中…"
      errorLabel="登録に失敗しました。もう一度お試しください。"
      onSubmit={async (data) => {
        duplicateToast.dismiss();
        const result = (await createWhiskyAction(data)).data;
        // 重複は製品ページへ移らず、既存の製品を示して入力内容を残す。
        if (result?.status === "duplicate") {
          duplicateToast.show(result.whisky);
          return;
        }
        if (result?.status !== "created") return "failed";
        // 登録した内容をその場で確かめられるよう、一覧ではなく製品ページへ移る（#105）。
        router.push(`/whiskies/${result.id}`);
      }}
    />
  );
}
