import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateWhisky } from "@/lib/whiskies";
import { whiskyUpdateSchema } from "@/lib/schemas/whisky";

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
  const parsed = whiskyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateWhisky(session.user.id, id, parsed.data);

  if (result.status === "notFound") {
    return NextResponse.json(
      { error: "製品が見つかりません" },
      { status: 404 },
    );
  }

  // 409：製品名を変えて別の製品と重なった場合。
  // whisky に入るのは id・name・country・age だけ（→ whiskies.ts の DUPLICATE_SELECT）。
  if (result.status === "duplicate") {
    return NextResponse.json(
      { error: "この製品は既に登録されています", whisky: result.whisky },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  // 認可：where に userId を含めることで他人のボトルは削除できない。
  // deleteMany は非一意フィルタで userId を AND でき、件数を返すため 404 判定に使える
  // （所有権チェックと削除を 1 クエリでアトミックに。id が一意なので一致は最大 1 件）。
  const { count } = await prisma.bottle.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (count === 0) {
    return NextResponse.json(
      { error: "ボトルが見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
