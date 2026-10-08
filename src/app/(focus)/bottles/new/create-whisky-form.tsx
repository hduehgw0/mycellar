"use client";

import { useRouter } from "next/navigation";
import { WhiskyForm } from "../whisky-form";
import {
  dismissDuplicateBottleToast,
  showDuplicateBottleToast,
} from "../duplicate-bottle-toast";

// 登録用ラッパー：共有フォームに初期値・文言・送信処理（POST）を渡す。
export function CreateWhiskyForm() {
  const router = useRouter();
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
        dismissDuplicateBottleToast();
        const response = await fetch("/api/bottles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        // 重複は製品ページへ移らず、既存の製品を示して入力内容を残す。
        if (response.status === 409) {
          const { whisky } = await response.json();
          showDuplicateBottleToast(whisky);
          return;
        }
        if (!response.ok) return "failed";
        // 登録した内容をその場で確かめられるよう、一覧ではなく製品ページへ移る（#105）。
        const { id } = await response.json();
        router.push(`/bottles/${id}`);
        router.refresh();
      }}
    />
  );
}
