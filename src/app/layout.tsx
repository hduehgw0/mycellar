import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="ja" className={cn("font-sans", geist.variable)}>
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
