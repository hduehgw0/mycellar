import { requireSession } from "@/lib/session";
import { BottleForm } from "./bottle-form";

export default async function NewBottlePage() {
  await requireSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-bold">ボトルを登録</h1>
      <BottleForm />
    </main>
  );
}
