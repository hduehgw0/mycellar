import { Prisma, type Whisky } from "@/generated/prisma/client";
import { toNameKey } from "@/lib/name-key";
import { prisma } from "@/lib/prisma";
import type {
  WhiskyCreateOutput,
  WhiskyUpdateOutput,
} from "@/lib/schemas/whisky";

// 製品の書き込みはここだけを通す。Route Handler から Prisma を直接呼ぶと
// nameKey の設定漏れが起きるため。

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
  // 本数は Whisky の列ではないので、updateMany に渡す前に取り出す。
  { quantity, ...fields }: WhiskyUpdateOutput,
): Promise<UpdateResult> {
  // 製品名が送られたときだけ作り直す（undefined の列は Prisma が更新しない）。
  const nameKey =
    fields.name === undefined ? undefined : toNameKey(fields.name);

  try {
    // 項目の更新と本数の増減をまとめ、どちらかが失敗したら両方を戻す
    // （製品名が重複したら本数も変えない）。
    return await prisma.$transaction(async (tx) => {
      // 認可：where に userId を含めることで他人の製品は更新できない。
      // updateMany は非一意フィルタで userId を AND でき、件数を返すため 404 判定に使える。
      const { count } = await tx.whisky.updateMany({
        where: { id, userId },
        data: { ...fields, nameKey },
      });
      if (count === 0) return { status: "notFound" };

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

// 製品のボトルを quantity 本にそろえる。
async function setBottleCount(
  tx: Prisma.TransactionClient,
  userId: string,
  whiskyId: string,
  quantity: number,
) {
  // 製品の行をロックしてから数える。ロックしないと、二重送信で両方が同じ本数を数え、
  // 足しすぎたり消しすぎたりする（空の更新では updateMany が行をロックしない）。
  await tx.$queryRaw`SELECT id FROM whisky WHERE id = ${whiskyId} FOR UPDATE`;

  const bottles = await tx.userBottle.findMany({
    where: { whiskyId, userId },
    select: { id: true },
    // ボトルはまだ見分ける情報を持たないので、どれを消しても同じ。新しいものから消す。
    orderBy: { createdAt: "desc" },
  });
  const diff = quantity - bottles.length;

  if (diff > 0) {
    await tx.userBottle.createMany({
      data: Array.from({ length: diff }, () => ({ whiskyId, userId })),
    });
  } else if (diff < 0) {
    await tx.userBottle.deleteMany({
      where: { id: { in: bottles.slice(0, -diff).map(({ id }) => id) } },
    });
  }
}
