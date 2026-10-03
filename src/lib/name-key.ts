// 製品名の重複判定に使う nameKey を作る（→ docs/adr.md ADR-0016）。
// nameKey は列に保存されるため、規則を変えると既存の行と比べられなくなる。
export function toNameKey(name: string): string {
  return (
    name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "")
      // 除いた文字に挟まれて 1 回目では合成されなかった文字（e と ´ など）を合成し直す。
      .normalize("NFC")
  );
}
