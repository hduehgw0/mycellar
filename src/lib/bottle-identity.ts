// 「同じ物」の判定キーを組み立てる（→ docs/data-model.md「重複をどう防ぐか」・ADR-0013）。

// 判定キーの区切り。入力に現れない制御文字（Unit Separator）を使い、
// 混入は共有スキーマ（src/lib/schemas/bottle.ts）で弾く。
export const IDENTITY_KEY_SEPARATOR = "\u001F";

// 表記ゆれを吸収する。#61（傾向ページの銘柄数）は判定キーではなくこの関数だけを使う。
//
// 順序は NFKC → 小文字化 → 空白除去 で固定する。小文字化を先にすると NFKC が
// 後から大文字を作って残る（例：「ᴬ」は NFKC 先で "a"、小文字先で "A"）。
// toLocaleLowerCase は使わない（トルコ語ロケールで I → ı となり環境ごとに結果が変わる）。
export function normalizeText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s/gu, "");
}

type IdentityFields = {
  name: string;
  age?: number | null;
  caskType?: string | null;
  isLimited?: boolean;
};

// 判定キーは列に保存されるため、下記の表現は後から変えられない（変えると既存行が無効になる）。
//   age  … 未入力・NAS は ""（"0" にすると「0年」と同じキーになる）／数値はそのまま
//   cask … 未入力は ""
//   isLimited … "1" / "0"（真偽値に「未入力」は無いので "" は使わない）
export function buildIdentityKey({
  name,
  age,
  caskType,
  isLimited,
}: IdentityFields): string {
  return [
    normalizeText(name),
    age == null ? "" : String(age),
    caskType == null ? "" : normalizeText(caskType),
    isLimited ? "1" : "0",
  ].join(IDENTITY_KEY_SEPARATOR);
}
