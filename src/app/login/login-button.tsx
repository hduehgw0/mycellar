"use client";

import { useState } from "react";
import { Google_Sans } from "next/font/google";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const LOGIN_ERROR = "ログインを開始できませんでした。もう一度お試しください。";

// Google のブランドガイドラインが指定する書体（Google Sans Medium）。ラテン文字しか
// 持たないので「Google」だけに当て、日本語はアプリの書体のままにする。
const googleSans = Google_Sans({ subsets: ["latin"], weight: "500" });

// モックのマーク。Google のブランド 4 色を 90 度ずつ配した輪で、公式の G ロゴではない。
const GOOGLE_COLORS = ["#fbbc05", "#34a853", "#4285f4", "#ea4335"];

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        className="h-14 w-full gap-3 bg-foreground text-base text-background hover:bg-foreground/90"
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
        <svg viewBox="-10 -10 20 20" aria-hidden className="size-5">
          {GOOGLE_COLORS.map((color, i) => (
            <path
              key={color}
              d="M5.3 -5.3A7.5 7.5 0 0 1 5.3 5.3"
              fill="none"
              stroke={color}
              strokeWidth="5"
              transform={`rotate(${i * 90})`}
            />
          ))}
        </svg>
        {pending ? (
          "リダイレクト中…"
        ) : (
          <span>
            <span className={googleSans.className}>Google</span> でログイン
          </span>
        )}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
