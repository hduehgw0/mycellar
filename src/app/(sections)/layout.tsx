import { TabBar } from "./tab-bar";

// タブの行き先（/bottles・/stats・/account）を覆うシェル。タブバーが出るのはここだけ。
// 認証（requireSession）は各 page に残す：layout は同一 layout を共有するルート間の
// クライアント遷移で再レンダリングされず、認証境界にならないため（→ ADR-0010）。
export default function SectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <nav> は <main> の兄弟にする。グローバルなナビゲーションを <main> に入れると
    // ランドマークとして誤りになる。
    <>
      {/* 下余白 96px は正本の値（バー 82px ＋ 14px）。実機ではこれに安全領域を足す。 */}
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-10 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar />
    </>
  );
}
