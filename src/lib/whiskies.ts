import { Prisma, type Whisky } from "@/generated/prisma/client";
import { toNameKey } from "@/lib/name-key";
import { prisma } from "@/lib/prisma";
import type {
  WhiskyCreateOutput,
  WhiskyUpdateOutput,
} from "@/lib/schemas/whisky";

// 製品の書き込みと、URL の id で製品を引く読み取りはここを通す。
// 直接 Prisma を呼ぶと、nameKey の設定や userId の条件を書き忘れるため。

export type CreateResult =
  | { status: "created"; whisky: Whisky }
  | { status: "duplicate"; whisky: Whisky };

export type UpdateResult =
  | { status: "updated" }
  | { status: "duplicate"; whisky: Whisky }
  | { status: "notFound" };

const isDuplicateError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

// P2002 は違反した制約しか持たず、衝突相手の行は入っていないので取りに行く。
// 「先に検索してから書く」順にすると、二重送信で両方が検索をすり抜ける。
function findByNameKey(userId: string, nameKey: string) {
  return prisma.whisky.findUnique({
    where: { userId_nameKey: { userId, nameKey } },
  });
}

export async function createWhisky(
  userId: string,
  { quantity, ...fields }: WhiskyCreateOutput,
): Promise<CreateResult> {
  const nameKey = toNameKey(fields.name);

  try {
    // 入れ子の書き込みは 1 つのトランザクションになり、ボトルの無い製品が残らない。
    const whisky = await prisma.whisky.create({
      data: {
        ...fields,
        nameKey,
        // 認可：所有者はボディではなくセッションから決める。
        userId,
        // ボトルの whiskyId と userId は、作った製品から Prisma が埋める。
        bottles: {
          createMany: { data: Array.from({ length: quantity }, () => ({})) },
        },
      },
    });
    return { status: "created", whisky };
  } catch (error) {
    if (!isDuplicateError(error)) throw error;

    const existing = await findByNameKey(userId, nameKey);
    if (!existing) throw error; // 衝突直後に消された場合のみ。通常は必ず見つかる。
    return { status: "duplicate", whisky: existing };
  }
}

export async function updateWhisky(
  userId: string,
  id: string,
  // 本数は Whisky の列ではないので、製品の更新に渡す前に取り出す。
  { quantity, ...fields }: WhiskyUpdateOutput,
): Promise<UpdateResult> {
  // 製品名が送られたときだけ作り直す（undefined の列は Prisma が更新しない）。
  const nameKey =
    fields.name === undefined ? undefined : toNameKey(fields.name);

  try {
    // 項目の更新と本数の増減をまとめ、どちらかが失敗したら両方を戻す
    // （製品名が重複したら本数も変えない）。
    return await prisma.$transaction(async (tx) => {
      // 認可とロックを 1 回で行う。他人の製品や存在しない製品は 0 行になる。
      // ロックは、二重送信で両方が同じ本数を数えて足しすぎるのと、途中で製品が消されるのを防ぐ。
      const [target] = await tx.$queryRaw<[] | [{ id: string }]>`
        SELECT id FROM whisky WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
      if (!target) return { status: "notFound" };

      await tx.whisky.update({ where: { id }, data: { ...fields, nameKey } });
      if (quantity !== undefined) {
        await setBottleCount(tx, userId, id, quantity);
      }
      return { status: "updated" };
    });
  } catch (error) {
    // nameKey === undefined の判定は、下の findByNameKey に渡せるよう型を string に絞るためのもの。
    if (!isDuplicateError(error) || nameKey === undefined) throw error;

    const existing = await findByNameKey(userId, nameKey);
    if (!existing) throw error;
    return { status: "duplicate", whisky: existing };
  }
}

// 製品のボトルを quantity 本にそろえる。製品の行はロック済みであること。
async function setBottleCount(
  tx: Prisma.TransactionClient,
  userId: string,
  whiskyId: string,
  quantity: number,
) {
  const bottles = await tx.userBottle.findMany({
    where: { whiskyId, userId },
    select: { id: true },
  });
  const diff = quantity - bottles.length;

  if (diff > 0) {
    await tx.userBottle.createMany({
      data: Array.from({ length: diff }, () => ({ whiskyId, userId })),
    });
  } else if (diff < 0) {
    // ボトルはまだ見分ける情報を持たないので、どれを消しても同じ。
    await tx.userBottle.deleteMany({
      where: { id: { in: bottles.slice(0, -diff).map(({ id }) => id) } },
    });
  }
}

// 自分の製品を id で引く。他人の id や存在しない id は null になる（画面は 404）。
// 認可の条件を呼ぶ側ごとに書くと、userId の書き忘れで他人の製品が見えるため、ここに 1 つにする。
export function getOwnedWhisky(userId: string, id: string) {
  return prisma.whisky.findUnique({
    where: { id_userId: { id, userId } },
    // 製品ページと編集ページが出す項目だけを取る。内部の列や後から足した列を、ブラウザへ渡さないため。
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      age: true,
      caskType: true,
      isLimited: true,
      memo: true,
      // 本数は Whisky の列ではないので一緒に数える。
      _count: { select: { bottles: true } },
    },
  });
}
