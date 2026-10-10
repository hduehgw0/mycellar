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
const QUANTITY_MESSAGE = "本数は1〜99の整数で入力してください";
const REGION_MESSAGE = "地域は国がスコットランドのときだけ選べます";

// 1 本 = 1 行なので、上限が無いと 1 回の要求で行を際限なく作れる。
const quantitySchema = z
  .int(QUANTITY_MESSAGE)
  .min(1, QUANTITY_MESSAGE)
  .max(99, QUANTITY_MESSAGE);

const regionNeedsScotland = ({
  country,
  region,
}: {
  country?: string | null;
  region?: string | null;
}) => region == null || country === "スコットランド";

// 値のルールの土台。API とフォームのスキーマはここから作り、ルールを二重に書かない（→ CLAUDE.md アーキの鉄則）。
// 既定値と項目間のルールは持たない。zod は refine 済みのスキーマを .partial() できない。
const whiskyBaseSchema = z.object({
  name: z
    .string()
    .trim()
    // nameKey の一意索引は約 2700 バイトを超える値を拒否する。実在の製品名は長くても 50 字前後。
    .max(100, "製品名は100文字以内で入力してください")
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
    .max(500, "メモは500文字以内で入力してください")
    // 空欄は値なし（null）に揃える。DB に空文字を残さず、更新では「消す」の意味になる。
    .transform((value) => (value === "" ? null : value))
    .nullish(),
});

// 登録の API が受け取る値。送られなかった項目は既定値で埋めるか、値なしとして扱う。
export const whiskyCreateSchema = whiskyBaseSchema
  .extend({
    isLimited: z.boolean().default(false),
    // 登録時にまとめて作るボトルの数。
    quantity: quantitySchema.default(1),
  })
  .refine(regionNeedsScotland, { error: REGION_MESSAGE, path: ["region"] });

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

// 登録・編集で共有するフォームが持つ値。全項目をいつも持ち、任意の項目の空欄は null。
// API と違い、項目が欠けていたら補わずに弾く。
export const whiskyFormSchema = whiskyBaseSchema
  .required()
  .extend({ quantity: quantitySchema })
  .refine(regionNeedsScotland, { error: REGION_MESSAGE, path: ["region"] });

export type WhiskyFormInput = z.input<typeof whiskyFormSchema>;
export type WhiskyFormOutput = z.output<typeof whiskyFormSchema>;
