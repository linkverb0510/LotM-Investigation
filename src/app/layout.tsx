import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mystery Card Club",
  description: "一个以《诡秘之主》氛围为灵感的朋友局在线卡牌游戏。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
