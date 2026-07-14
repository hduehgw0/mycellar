// 必須環境変数を取得し、未設定なら変数名付きで即 throw する（fail-fast）。
// prisma.config.ts の env() と同じ思想を、アプリ実行時コードにも適用する。
// 未設定を `as string` で握りつぶすと、後段（ログイン時など）で分かりにくく壊れるため、
// モジュール読み込み時点で明確に落とす。
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`必須の環境変数 ${name} が未設定です`);
  }
  return value;
}
