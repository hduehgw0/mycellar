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
    <>
      {/* 下余白はバーの高さ（globals.css の --spacing-tab-bar）＋ 実機の安全領域
          ＋ 呼吸分。バーの高さを直に書くと、バー側を変えたとき静かにズレる。 */}
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-10 pb-[calc(var(--spacing-tab-bar)+env(safe-area-inset-bottom)+--spacing(4))]">
        {children}
      </main>
      <TabBar />
    </>
  );
}
