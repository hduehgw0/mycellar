import "server-only";
import { prisma } from "@/lib/prisma";

// 一覧ページ用。新しい順で、カードに出す項目と本数だけを取る。
export function listWhiskies(userId: string) {
  return prisma.whisky.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      age: true,
      isLimited: true,
      _count: { select: { bottles: true } },
    },
  });
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
