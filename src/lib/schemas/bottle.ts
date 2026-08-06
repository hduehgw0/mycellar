import { z } from "zod";

import { IDENTITY_KEY_SEPARATOR, normalizeText } from "@/lib/bottle-identity";

// 産地の固定リスト（表記ゆれ防止・選択肢はここで一元管理 → docs/adr.md の ADR-0009）。
// 5 大ウイスキーの産地。
export const REGIONS = [
  "スコットランド",
  "アイルランド",
  "アメリカ",
  "カナダ",
  "日本",
] as const;

// 空文字は「未入力」として undefined に正規化する（DB に空文字を残さない）。
// null も受理する（nullish）：編集で既存値を消す際、フォームは明示 null を送る。
// undefined（未送信）＝更新しない／null＝値を消す、という PATCH の契約を Prisma と揃える。
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .nullish();

// 判定キーは 4 項目を区切り文字でつなぐため、値に区切りが混ざると別の組み合わせと
// 同じキーになりうる。API には UI を通さず送れるので、キーに入る自由入力
// （銘柄名・樽）はここで弾く（→ docs/data-model.md「重複をどう防ぐか」）。
const SEPARATOR_MESSAGE = "使用できない文字が含まれています";
const hasNoSeparator = (value: string) =>
  !value.includes(IDENTITY_KEY_SEPARATOR);

const optionalKeyText = z
  .string()
  .trim()
  .refine(hasNoSeparator, SEPARATOR_MESSAGE)
  .transform((value) => (value === "" ? undefined : value))
  .nullish();

// フォーム（クライアント）と Route Handler（サーバ再検証）で共有する（→ CLAUDE.md アーキの鉄則）。
export const bottleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "銘柄名を入力してください")
    // 不可視文字だけの銘柄名は trim も min(1) も通り抜けるが、正規化すると空になる。
    // 判定キーの銘柄名が空の行を作らせない（一覧にも名前の無いカードが並ぶ）。
    .refine(
      (value) => normalizeText(value).length > 0,
      "銘柄名を入力してください",
    )
    .refine(hasNoSeparator, SEPARATOR_MESSAGE),
  region: z.enum(REGIONS).nullish(),
  subRegion: optionalText,
  age: z
    .number()
    .int("年数は1以上の整数で入力してください")
    .min(1, "年数は1以上の整数で入力してください")
    .nullish(),
  caskType: optionalKeyText,
  isLimited: z.boolean().default(false),
  quantity: z
    .number()
    .int("本数は1以上の整数で入力してください")
    .min(1, "本数は1以上の整数で入力してください")
    .default(1),
  note: optionalText,
});

// bottleSchema の 2 つの顔。zod は検証時に値を変換するので、入れる前と出た後で型が違う。
// 差が出るのは .default() を持つ 2 つだけ（quantity・isLimited が必須になる）。
export type BottleInput = z.input<typeof bottleSchema>; // 変換前：フォームが持つ値
export type BottleValues = z.output<typeof bottleSchema>; // 変換後：検証を通った値

export const bottleUpdateSchema = bottleSchema.required();
export type BottleUpdateValues = z.output<typeof bottleUpdateSchema>;
