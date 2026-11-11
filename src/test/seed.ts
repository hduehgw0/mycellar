import { toNameKey } from "@/features/whisky/name-key";
import { prisma } from "@/lib/prisma";

// テストの前提となる製品は、テストする関数を通さずに作る。
export async function seedWhisky(
  userId: string,
  {
    name = "山崎 12年",
    quantity = 1,
    ...fields
  }: { name?: string; quantity?: number; country?: string; age?: number } = {},
) {
  const { id } = await prisma.whisky.create({
    data: {
      ...fields,
      name,
      nameKey: toNameKey(name),
      userId,
      bottles: {
        createMany: { data: Array.from({ length: quantity }, () => ({})) },
      },
    },
  });
  return id;
}
