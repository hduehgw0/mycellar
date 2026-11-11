import { WHISKY_STATS_SELECT } from "@/features/stats/collection-stats";
import { prisma } from "@/lib/prisma";

export function listWhiskiesForStats(userId: string) {
  return prisma.whisky.findMany({
    where: { userId },
    select: WHISKY_STATS_SELECT,
  });
}
