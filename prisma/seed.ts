import { parseArgs } from "node:util";

import { requireEnv } from "@/lib/env";
import { toNameKey } from "@/lib/name-key";
import { prisma } from "@/lib/prisma";
import { whiskyCreateSchema } from "@/lib/schemas/whisky";

import { LARGE_SAMPLES, SMALL_SAMPLES } from "./seed/whiskies";

const { values } = parseArgs({
  options: { large: { type: "boolean", default: false } },
});

async function main() {
  const email = requireEnv("SEED_USER_EMAIL");
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      `${email} の利用者がいません。先に手元で、このアカウントで Google にログインしてください`,
    );
  }

  // 値の決まり（国・地域・樽の値など）は zod だけが知っていて、DB は守らないので、登録と同じスキーマを通す。
  const samples = (values.large ? LARGE_SAMPLES : SMALL_SAMPLES).map(
    (sample) => {
      const { quantity, ...fields } = whiskyCreateSchema.parse(sample);
      return {
        quantity,
        fields: { ...fields, nameKey: toNameKey(fields.name) },
      };
    },
  );

  const now = Date.now();
  const bottles = await prisma.$transaction(async (tx) => {
    // 開発用の DB は Preview と共有なので、消すのは見本の持ち主の製品だけにする。ボトルは製品と一緒に消える。
    await tx.whisky.deleteMany({ where: { userId: user.id } });

    const created = await tx.whisky.createManyAndReturn({
      data: samples.map(({ fields }, i) => ({
        ...fields,
        userId: user.id,
        // 一度に作ると作成日時がそろい、作成日時で並べる一覧の順が毎回変わるので、見本の順にずらす。
        createdAt: new Date(now - i * 60_000),
      })),
      select: { id: true, nameKey: true },
    });
    const idByNameKey = new Map(
      created.map(({ id, nameKey }) => [nameKey, id]),
    );

    const data = samples.flatMap(({ quantity, fields }) => {
      const whiskyId = idByNameKey.get(fields.nameKey);
      if (!whiskyId)
        throw new Error(`作った製品が見つかりません：${fields.name}`);
      return Array.from({ length: quantity }, () => ({
        whiskyId,
        userId: user.id,
      }));
    });
    await tx.userBottle.createMany({ data });
    return data.length;
  });

  console.info(`製品 ${samples.length} 件・ボトル ${bottles} 本を入れました`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
