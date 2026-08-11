"use client";

import { useState } from "react";
import Image from "next/image";
import { Google_Sans } from "next/font/google";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import googleG from "./google-g.svg";

const LOGIN_ERROR = "ログインを開始できませんでした。もう一度お試しください。";

// Google のブランドガイドラインが指定する書体（Google Sans Medium）。ラテン文字しか
// 持たないので「Google」だけに当て、日本語はアプリの書体のままにする。
const googleSans = Google_Sans({ subsets: ["latin"], weight: "500" });

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        // 白地はブランドガイドラインの指定（G ロゴは白の上に置く）。テーマの色ではない。
        className="h-14 w-full gap-3 bg-white text-base text-background hover:bg-white/90"
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
        <Image src={googleG} alt="" className="h-5 w-auto" />
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
