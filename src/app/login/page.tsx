import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginButton } from "./login-button";
import bottleAmber from "./bottle-amber-bare.svg";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/bottles");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-12 px-6 pt-10 pb-8">
      <Image src={bottleAmber} alt="" priority className="m-auto size-64" />

      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-[2.5rem]/none font-semibold">
          MyCellar
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          ウイスキーコレクションを、
          <br />
          一本ずつ静かに記録する。
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <LoginButton />
        <p className="text-center text-xs leading-5 text-muted-foreground">
          ログインすると自分のコレクションだけが
          <br />
          安全に保存・表示されます。
        </p>
      </div>
    </main>
  );
}
