import { Prisma, type Whisky } from "@/generated/prisma/client";
import { toNameKey } from "@/lib/name-key";
import { prisma } from "@/lib/prisma";
import type { WhiskyCreateOutput } from "@/lib/schemas/whisky";

// 製品の書き込みはここだけを通す。Route Handler から Prisma を直接呼ぶと
// nameKey の設定漏れが起きるため。

export type CreateResult =
  | { status: "created"; whisky: Whisky }
  | { status: "duplicate"; whisky: Whisky };

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
