import { z } from "zod";

// 国の固定リスト（表記ゆれ防止・選択肢はここで一元管理 → docs/data-model.md）。
// 5 大ウイスキーの国＋主要な新興産地。中身は父と確定するまでの暫定（追加はこの配列に足すだけ）。
export const REGIONS = [
  "スコットランド",
  "アイルランド",
  "アメリカ",
  "カナダ",
  "日本",
  "台湾",
  "インド",
  "オーストラリア",
] as const;

// 空文字は「未入力」として undefined に正規化する（DB に空文字を残さない）。
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

// フォーム（クライアント）と Route Handler（サーバ再検証）で共有する（→ CLAUDE.md アーキの鉄則）。
export const bottleSchema = z.object({
  name: z.string().trim().min(1, "銘柄名を入力してください"),
  region: z.enum(REGIONS).optional(),
  subRegion: optionalText,
  age: z
    .number()
    .int()
    .min(1, "年数は1以上の整数で入力してください")
    .optional(),
  caskType: optionalText,
  isLimited: z.boolean().default(false),
  quantity: z
    .number()
    .int("本数は1以上の整数で入力してください")
    .min(1, "本数は1以上の整数で入力してください")
    .default(1),
  note: optionalText,
});

export type BottleInput = z.input<typeof bottleSchema>;
export type BottleData = z.output<typeof bottleSchema>;
