import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "公司调研助手",
  description: "BYOD 档案评分系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
