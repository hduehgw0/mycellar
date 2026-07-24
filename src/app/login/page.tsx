import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginButton } from "./login-button";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/bottles");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">MyCellar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ウイスキーコレクションを管理するにはログインしてください。
        </p>
      </div>
      <LoginButton />
    </main>
  );
}
