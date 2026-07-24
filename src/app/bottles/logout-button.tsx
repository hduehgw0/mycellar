"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const LOGOUT_ERROR = "ログアウトに失敗しました。もう一度お試しください。";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const { error } = await authClient.signOut();
            // 失敗時は遷移せず、理由を伝えて再操作可能に戻す。
            if (error) {
              setError(LOGOUT_ERROR);
              setPending(false);
              return;
            }
            router.push("/login");
            router.refresh();
          } catch {
            setError(LOGOUT_ERROR);
            setPending(false);
          }
        }}
      >
        ログアウト
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
