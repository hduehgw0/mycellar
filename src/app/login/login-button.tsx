"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/bottles",
          });
          // 成功時は Google へ遷移するため以降は実行されない。
          // 失敗時のみここに到達するので、ボタンを再操作可能に戻す。
          if (error) setPending(false);
        } catch {
          setPending(false);
        }
      }}
      className="w-full rounded-md border border-gray-300 px-4 py-3 font-medium disabled:opacity-60"
    >
      {pending ? "リダイレクト中…" : "Google でログイン"}
    </button>
  );
}
