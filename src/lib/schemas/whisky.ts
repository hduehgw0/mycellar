import { z } from "zod";

import { toNameKey } from "@/lib/name-key";

// 国・地域・樽の値域（→ docs/adr.md ADR-0017）。値の追加にマイグレーションは要らない。
export const COUNTRIES = [
  "スコットランド",
  "アイルランド",
  "アメリカ",
  "日本",
  "カナダ",
  "イングランド",
  "台湾",
  "インド",
  "イスラエル",
  "オーストラリア",
  "フランス",
  "ドイツ",
  "タイ",
  "その他",
] as const;

export const REGIONS = [
  "アイラ",
  "スペイサイド",
  "ハイランド",
  "ローランド",
  "キャンベルタウン",
  "アイランズ",
  "その他",
] as const;

export const CASK_TYPES = [
  "バーボン樽",
  "シェリー樽",
  "シェリー樽（オロロソ）",
  "シェリー樽（PX）",
  "ポート樽",
  "ワイン樽",
  "ラム樽",
  "バージンオーク樽",
  "ミズナラ樽",
  "その他",
] as const;

const AGE_MESSAGE = "年数は0〜100の整数で入力してください";
const QUANTITY_MESSAGE = "本数は1以上の整数で入力してください";
const REGION_MESSAGE = "地域は国がスコットランドのときだけ選べます";

const quantitySchema = z.int(QUANTITY_MESSAGE).min(1, QUANTITY_MESSAGE);

const regionNeedsScotland = ({
  country,
  region,
}: {
  country?: string | null;
  region?: string | null;
}) => region == null || country === "スコットランド";

// 既定値と項目間のルールを持たない土台。zod は refine 済みのスキーマを .partial() できない。
const whiskyBaseSchema = z.object({
  name: z
    .string()
    .trim()
    // 空文字・空白だけ・不可視文字だけを 1 つで弾く（どれも nameKey が空になる）。
    .refine((value) => toNameKey(value).length > 0, "製品名を入力してください"),
  country: z.enum(COUNTRIES).nullish(),
  region: z.enum(REGIONS).nullish(),
  age: z.int(AGE_MESSAGE).min(0, AGE_MESSAGE).max(100, AGE_MESSAGE).nullish(),
  caskType: z.enum(CASK_TYPES).nullish(),
  isLimited: z.boolean(),
  memo: z
    .string()
    .trim()
    // 空欄は値なし（null）に揃える。DB に空文字を残さず、更新では「消す」の意味になる。
    .transform((value) => (value === "" ? null : value))
    .nullish(),
});

// フォーム（クライアント）と Route Handler（サーバ再検証）で共有する（→ CLAUDE.md アーキの鉄則）。
export const whiskyCreateSchema = whiskyBaseSchema
  .extend({
    isLimited: z.boolean().default(false),
    // 登録時にまとめて作るボトルの数。
    quantity: quantitySchema.default(1),
  })
  .refine(regionNeedsScotland, { error: REGION_MESSAGE, path: ["region"] });

// zod は検証時に値を変換するので、入れる前（フォームが持つ値）と出た後（検証を通った値）で型が違う。
export type WhiskyCreateInput = z.input<typeof whiskyCreateSchema>;
export type WhiskyCreateOutput = z.output<typeof whiskyCreateSchema>;

// 部分更新。送られてきた項目だけを変えるため、既定値を持たせない（既定値が送っていない項目を上書きする）。
export const whiskyUpdateSchema = whiskyBaseSchema
  .partial()
  .extend({
    // 編集後に持っている本数。
    quantity: quantitySchema.optional(),
  })
  // 片方だけでは、もう片方の今の値（DB にある）と組み合わせた検査ができない。
  .refine(
    ({ country, region }) => (country === undefined) === (region === undefined),
    { error: "国と地域は組で送ってください" },
  )
  .refine(regionNeedsScotland, { error: REGION_MESSAGE, path: ["region"] });

export type WhiskyUpdateOutput = z.output<typeof whiskyUpdateSchema>;
