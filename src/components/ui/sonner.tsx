"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

// shadcn の既定は next-themes の useTheme でテーマを決めるが、本アプリはテーマを
// 切り替えないため依存ごと外した。色は下の CSS 変数（globals.css のトークン）から取る。
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // sonner の既定は light で、閉じるボタンが暗い地に暗い × になり見えない。アプリは dark 固定（layout.tsx）。
      theme="dark"
      // sonner は OS の標準フォントを指定するので、アプリのフォントに戻す。
      className="toaster group font-sans!"
      toastOptions={{
        classNames: {
          title: "text-sm! font-bold!",
          // 下の info の丸（モック 08）が既定の 16px の枠に収まらないため広げる。
          icon: "size-5.5!",
          // 既定は左上の角に掛かる丸いボタン。モック 08 に合わせ、枠なしの × を右上の内側に置く。
          // sonner の CSS は属性セレクタで詳細度が高いので、上書きには ! が要る。
          closeButton:
            "top-1! right-1! left-auto! size-11! transform-none! border-0! bg-transparent! text-muted-foreground! hover:text-foreground! [&_svg]:size-4",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: (
          <span
            aria-hidden
            className="flex size-5.5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
          >
            i
          </span>
        ),
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
