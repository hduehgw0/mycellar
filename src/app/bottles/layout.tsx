// /bottles 配下の共通コンテナ。各ページで反復していた <main> をここに集約する。
// 認証（requireSession）は各 page に残す：layout は同一 layout を共有するルート間の
// クライアント遷移で再レンダリングされず、認証境界にならないため（→ ADR-0010）。
export default function BottlesLayout({
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
