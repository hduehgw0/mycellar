import { prisma } from "@/lib/prisma";

// 自分（userId）のボトルだけを id で引く。
// where に userId を必ず含めることが認可の要（他人の id を渡しても取得できない）。
export function getOwnedBottle(id: string, userId: string) {
  return prisma.bottle.findFirst({ where: { id, userId } });
}
