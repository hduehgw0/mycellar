"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/bottles",
        });
      }}
      className="w-full rounded-md border border-gray-300 px-4 py-3 font-medium disabled:opacity-60"
    >
      {pending ? "リダイレクト中…" : "Google でログイン"}
    </button>
  );
}
