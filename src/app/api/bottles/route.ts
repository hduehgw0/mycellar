import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createWhisky } from "@/lib/whiskies";
import { whiskyCreateSchema } from "@/lib/schemas/whisky";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  // クライアント側バリデーションは信用せず、共有スキーマでサーバでも再検証する。
  const parsed = whiskyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 },
    );
  }

  const result = await createWhisky(session.user.id, parsed.data);

  // 409：入力の誤りではなく既存の状態との衝突なので 400 と分ける。
  // 返すのは重複のカードに出す項目だけ（nameKey・userId は外に出さない）。
  if (result.status === "duplicate") {
    const { id, name, country, age } = result.whisky;
    return NextResponse.json(
      {
        error: "この製品は既に登録されています",
        whisky: { id, name, country, age },
      },
      { status: 409 },
    );
  }

  // 登録後は製品ページへ移るので、id だけを返す。
  return NextResponse.json({ id: result.whisky.id }, { status: 201 });
}
