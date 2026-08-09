import { requireSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

// ログアウトの正式な置き場。アカウント情報の表示など中身は #62。
export default async function AccountPage() {
  await requireSession();

  return (
    <>
      <h1 className="font-heading text-xl font-bold">アカウント</h1>
      <LogoutButton />
    </>
  );
}
