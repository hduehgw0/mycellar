import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BottleForm } from "./bottle-form";

export default async function NewBottlePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-bold">ボトルを登録</h1>
      <BottleForm />
    </main>
  );
}
