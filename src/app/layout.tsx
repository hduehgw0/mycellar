import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
