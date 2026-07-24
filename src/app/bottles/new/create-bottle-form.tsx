"use client";

import { useRouter } from "next/navigation";
import { BottleForm } from "../bottle-form";

// 登録用ラッパー：共有フォームに初期値・文言・送信処理（POST）を渡す。
export function CreateBottleForm() {
  const router = useRouter();
  return (
    <BottleForm
      defaultValues={{
        name: "",
        subRegion: "",
        caskType: "",
        isLimited: false,
        quantity: 1,
        note: "",
      }}
      submitLabel="登録する"
      submittingLabel="登録中…"
      errorLabel="登録に失敗しました。もう一度お試しください。"
      onSubmit={async (data) => {
        // 編集と違い空→null 正規化はせず data をそのまま送る（region は「未選択」で null になり得る）。
        const response = await fetch("/api/bottles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) return false;
        router.push("/bottles");
        router.refresh();
        return true;
      }}
    />
  );
}
