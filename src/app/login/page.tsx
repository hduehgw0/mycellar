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
      {/* m-auto で余白を上下に分け合う。ロゴは空いた場所の中央、以降は下寄せになる。 */}
      <Image src={bottleAmber} alt="" priority className="m-auto size-64" />

      <div className="flex flex-col gap-4">
        {/* ロゴタイプなので寸法はモックの実測値（40px）。Tailwind の目盛りは 36 と 48 で
            間が無い。行の高さは text-4xl と同じ 40px に揃え、前後の余白を変えない。 */}
        <h1 className="font-heading text-[2.5rem]/none font-semibold">
          MyCellar
        </h1>
        {/* 改行位置はモックどおり。日本語は文節で折り返さないと読みにくい。 */}
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
