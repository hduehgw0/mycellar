import type { Metadata } from "next";
import "./globals.css";
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// subsets に "japanese" は書けない（next/font のメタデータに無くビルドが落ちる）。
// 日本語のグリフは unicode-range 付きで自己ホストされるため latin 指定でも出る。
// subsets はプリロード対象を選ぶだけ。ウェイトはビルド時の取得量に直結するので使う分だけ。
const sans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

const heading = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "MyCellar",
  description:
    "父のウイスキーコレクションを管理する、自分専用の在庫・カタログアプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // dark は html に置く。ダーク値を :root へ移して .dark を消すやり方は採らない
    // （shadcn の部品が dark: に依存しており、全て通ったまま見た目だけ壊れる）。
    <html
      lang="ja"
      className={cn("dark font-sans", sans.variable, heading.variable)}
    >
      <body>
        {children}
        {/* トーストの表示先。ここに無いと toast() が無反応になるが型も lint も通るため、
            レイアウトを組み替えるときも下げない（→ #59）。
            位置はモックに合わせて上部（sonner の既定は bottom-right）。下部は送信ボタンと
            タブバー（#59）の定位置で、重ねると操作を塞ぐ。 */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
