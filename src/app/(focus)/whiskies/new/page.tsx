import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { FormPageHeader } from "@/components/form-page-header";
import { CreateWhiskyForm } from "./create-whisky-form";

export const metadata: Metadata = { title: "製品登録" };

export default async function NewWhiskyPage() {
  await requireSession();

  return (
    <>
      <FormPageHeader title="製品登録" cancelHref="/whiskies" />

      <CreateWhiskyForm />
    </>
  );
}
