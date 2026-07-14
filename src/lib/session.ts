import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// 認可の正はデータ取得側（この getSession）で行う。middleware は認可の根拠にしない（→ ADR-0010）。
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
