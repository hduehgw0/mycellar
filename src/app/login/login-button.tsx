"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const LOGIN_ERROR = "ログインを開始できませんでした。もう一度お試しください。";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full">
      <Button
        variant="outline"
        className="w-full"
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
              setError(LOGIN_ERROR);
              setPending(false);
            }
          } catch {
            setError(LOGIN_ERROR);
            setPending(false);
          }
        }}
      >
        {pending ? "リダイレクト中…" : "Google でログイン"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
