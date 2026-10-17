"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

// sonner の見た目は使わず（unstyled）、classNames でアプリのトークンから付ける。
// sonner の CSS はカスケードレイヤーの外に入るので、同じ要素に既定の指定があると
// Tailwind のクラスは詳細度に関係なく負ける。
// theme は既定の light のままにする。dark にすると、unstyled でも閉じるボタンと
// 説明文に sonner の色が付く。
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      toastOptions={{
        unstyled: true,
        classNames: {
          // フォントはトーストに付ける。外枠には sonner が OS の標準フォントを指定している。
          // 幅は狭い画面では sonner が画面の幅に合わせ、広い画面では --width になる。
          // 閉じるボタンがあるときは、その押せる範囲（right-1 ＋ size-11 ＝ 48px）の分だけ右を空ける。
          // 後ろに重なったトーストの中身は、sonner が既定の見た目でしか隠さないので、ここで隠す。
          toast:
            "flex w-(--width) items-start gap-3 rounded-lg border border-primary/30 bg-popover p-4 font-sans text-popover-foreground shadow-lg has-[[data-close-button]]:pr-12 data-[expanded=false]:data-[front=false]:*:opacity-0",
          // 見出しの 1 行目（高さ 20px）の中央にアイコンを置く。
          icon: "flex h-5 shrink-0 items-center",
          // min-w-0 が無いと、本文の枠は中身の全文の幅より細くならず、長い製品名がはみ出す。
          content: "flex min-w-0 flex-1 flex-col gap-2",
          title: "text-sm font-bold",
          description: "text-sm text-muted-foreground",
          // 押せる範囲は 44px。× は右上の内側に、枠を付けずに置く。
          closeButton:
            "absolute top-1 right-1 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground",
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
        close: <XIcon className="size-5" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
