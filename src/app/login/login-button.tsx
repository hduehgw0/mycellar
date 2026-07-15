"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const { error } = await authClient.signIn.social({
              provider: "google",
              callbackURL: "/bottles",
            });
            // 成功時は Google へ遷移するため以降は実行されない。
            // 失敗時のみここに到達するので、理由を伝えて再操作可能に戻す。
            if (error) {
              setError(
                "ログインを開始できませんでした。もう一度お試しください。",
              );
              setPending(false);
            }
          } catch {
            setError(
              "ログインを開始できませんでした。もう一度お試しください。",
            );
            setPending(false);
          }
        }}
        className="w-full rounded-md border border-gray-300 px-4 py-3 font-medium disabled:opacity-60"
      >
        {pending ? "リダイレクト中…" : "Google でログイン"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
