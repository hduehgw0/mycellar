import { Prisma, type Bottle } from "@/generated/prisma/client";
import { buildIdentityKey } from "@/lib/bottle-identity";
import { prisma } from "@/lib/prisma";
import type { BottleUpdateValues, BottleValues } from "@/lib/schemas/bottle";

// ボトルの書き込みはここだけを通す。Route Handler から Prisma を直接呼ぶと
// 判定キーの設定漏れが起きるため（登録と編集で同じキーになることを 1 か所で保証する）。

export type CreateResult =
  | { status: "created"; bottle: Bottle }
  | { status: "duplicate"; bottle: Bottle };

export type UpdateResult =
  | { status: "updated" }
  | { status: "duplicate"; bottle: Bottle }
  | { status: "notFound" };

const isDuplicateError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

// P2002 は違反した制約しか持たず、衝突相手の行は入っていないので取りに行く。
// 「先に検索してから書く」順にすると、二重送信で両方が検索をすり抜ける。
async function findByIdentityKey(userId: string, identityKey: string) {
  return prisma.bottle.findUnique({
    where: { userId_identityKey: { userId, identityKey } },
  });
}

export async function createBottle(
  userId: string,
  input: BottleValues,
): Promise<CreateResult> {
  const identityKey = buildIdentityKey(input);

  try {
    const bottle = await prisma.bottle.create({
      // 認可：所有者はボディではなくセッションから決める。
      data: { ...input, identityKey, userId },
    });
    return { status: "created", bottle };
  } catch (error) {
    if (!isDuplicateError(error)) throw error;

    const existing = await findByIdentityKey(userId, identityKey);
    if (!existing) throw error; // 衝突直後に消された場合のみ。通常は必ず見つかる。
    return { status: "duplicate", bottle: existing };
  }
}

export async function updateBottle(
  userId: string,
  id: string,
  input: BottleUpdateValues,
): Promise<UpdateResult> {
  const identityKey = buildIdentityKey(input);

  try {
    // 認可：where に userId を含めることで他人のボトルは更新できない。
    // updateMany は非一意フィルタで userId を AND でき、件数を返すため 404 判定に使える。
    const { count } = await prisma.bottle.updateMany({
      where: { id, userId },
      data: { ...input, identityKey },
    });
    return count === 0 ? { status: "notFound" } : { status: "updated" };
  } catch (error) {
    if (!isDuplicateError(error)) throw error;

    const existing = await findByIdentityKey(userId, identityKey);
    if (!existing) throw error;
    return { status: "duplicate", bottle: existing };
  }
}
