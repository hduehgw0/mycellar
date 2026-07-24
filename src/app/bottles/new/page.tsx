import { requireSession } from "@/lib/session";
import { CreateBottleForm } from "./create-bottle-form";

export default async function NewBottlePage() {
  await requireSession();

  return (
    <>
      <h1 className="text-xl font-bold">ボトルを登録</h1>
      <CreateBottleForm />
    </>
  );
}
