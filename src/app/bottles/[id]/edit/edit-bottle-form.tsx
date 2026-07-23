"use client";

import { useRouter } from "next/navigation";
import type { Bottle } from "@/generated/prisma/client";
import { REGIONS } from "@/lib/schemas/bottle";
import { BottleForm } from "../../bottle-form";

// 編集用ラッパー：共有フォームに既存値・文言・送信処理（PATCH）を渡す。
export function EditBottleForm({ bottle }: { bottle: Bottle }) {
  const router = useRouter();
  return (
    <BottleForm
      // 既存値で初期化。任意テキストの null はフォーム用に "" へ、
      // 国は DB では string 型だが値は REGIONS のいずれか（未設定は undefined）。
      defaultValues={{
        name: bottle.name,
        region: (bottle.region as (typeof REGIONS)[number] | null) ?? undefined,
        subRegion: bottle.subRegion ?? "",
        age: bottle.age ?? undefined,
        caskType: bottle.caskType ?? "",
        isLimited: bottle.isLimited,
        quantity: bottle.quantity,
        note: bottle.note ?? "",
      }}
      submitLabel="更新する"
      submittingLabel="更新中…"
      errorLabel="更新に失敗しました。もう一度お試しください。"
      onSubmit={async (data) => {
        // 空欄の任意項目は明示 null で送る（undefined だと JSON から落ち、PATCH で「変更なし」＝消せないため）。
        const payload = {
          ...data,
          region: data.region ?? null,
          subRegion: data.subRegion ?? null,
          age: data.age ?? null,
          caskType: data.caskType ?? null,
          note: data.note ?? null,
        };
        const response = await fetch(`/api/bottles/${bottle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) return false;
        router.push(`/bottles/${bottle.id}`);
        router.refresh();
        return true;
      }}
    />
  );
}
