"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const { error } = await authClient.signOut();
          // 失敗時は遷移せず、ボタンを再操作可能に戻す。
          if (error) {
            setPending(false);
            return;
          }
          router.push("/login");
          router.refresh();
        } catch {
          setPending(false);
        }
      }}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60"
    >
      ログアウト
    </button>
  );
}
