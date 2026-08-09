// タブの行き先から押し込んだ画面（1 本を見る・登録する・直す）を覆うシェル。
// タブバーは出さず、戻る導線は各 page が持つ（→ #59）。
// 認証（requireSession）は各 page に残す：layout は同一 layout を共有するルート間の
// クライアント遷移で再レンダリングされず、認証境界にならないため（→ ADR-0010）。
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      {children}
    </main>
  );
}
