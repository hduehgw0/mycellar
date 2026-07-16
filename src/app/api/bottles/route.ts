import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  // 認可：所有者はボディではなくセッションから決める（他人の userId を指定しても無視される）。
  const bottle = await prisma.bottle.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(bottle, { status: 201 });
}
