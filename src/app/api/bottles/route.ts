import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBottle } from "@/lib/bottles";
import { bottleSchema } from "@/lib/schemas/bottle";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  // クライアント側バリデーションは信用せず、共有スキーマでサーバでも再検証する。
  const parsed = bottleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 },
    );
  }

  const result = await createBottle(session.user.id, parsed.data);

  // 409：入力の誤りではなく既存の状態との衝突なので 400 と分ける。
  // 既存ボトルを返し、クライアントは詳細へ辿れるようにする。
  if (result.status === "duplicate") {
    return NextResponse.json(
      { error: "同じボトルが既にあります", bottle: result.bottle },
      { status: 409 },
    );
  }

  return NextResponse.json(result.bottle, { status: 201 });
}
