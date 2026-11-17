// 年数が空でも、NAS と確認済みなら「NAS」と出す。未確認は何も出さない。
export function ageLabel({
  age,
  isNas,
}: {
  age: number | null;
  isNas: boolean;
}) {
  if (age !== null) return `${age}年`;
  return isNas ? "NAS" : null;
}
