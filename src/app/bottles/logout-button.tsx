"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const { error } = await authClient.signOut();
            // 失敗時は遷移せず、理由を伝えて再操作可能に戻す。
            if (error) {
              setError("ログアウトに失敗しました。もう一度お試しください。");
              setPending(false);
              return;
            }
            router.push("/login");
            router.refresh();
          } catch {
            setError("ログアウトに失敗しました。もう一度お試しください。");
            setPending(false);
          }
        }}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60"
      >
        ログアウト
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
