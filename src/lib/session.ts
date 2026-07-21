import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// 認証（ログイン確認）はこの getSession で行う。所有権などの認可はデータ取得側（where に userId）で担い、
// middleware は認可の根拠にしない（→ ADR-0010）。
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// 保護ページ用。未ログインなら /login へ送り、以降はセッションを非 null として返す。
// redirect() は never を返すため、この関数を過ぎた呼び出し側では session が非 null に絞り込まれる。
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
