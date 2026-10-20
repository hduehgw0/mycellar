// DB のテストは表を空にするので、テスト用の DB 以外につながっていたら始めない。
export function assertTestDatabase(url: string | undefined) {
  if (!url) {
    throw new Error("DATABASE_URL が無いため、DB のテストを止めました");
  }
  const { hostname, pathname } = new URL(url);
  if (hostname !== "localhost" || pathname !== "/mycellar_test") {
    throw new Error(
      `テスト用の DB ではないため、DB のテストを止めました：${hostname}${pathname}`,
    );
  }
}
