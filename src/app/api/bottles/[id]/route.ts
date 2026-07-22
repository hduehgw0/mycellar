import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { bottleSchema } from "@/lib/schemas/bottle";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  // 認可：where に userId を含めることで他人のボトルは更新できない。
  // updateMany は非一意フィルタで userId を AND でき、件数を返すため 404 判定に使える
  // （所有権チェックと更新を 1 クエリでアトミックに。id が一意なので一致は最大 1 件）。
  const { count } = await prisma.bottle.updateMany({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });
  if (count === 0) {
    return NextResponse.json(
      { error: "ボトルが見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
