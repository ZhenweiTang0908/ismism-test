import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  preload: false,
  weight: ["400", "500", "700"],
});

const displayFont = Noto_Serif_SC({
  variable: "--font-display",
  preload: false,
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ismism Test",
  description: "测试用户在场域、本体、现象三条哲学轴线上的倾向。",
};

export async function generateStaticParams() {
  return [{ lang: "zh" }, { lang: "en" }];
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const resolvedParams = await params;
  return (
    <html
      lang={resolvedParams.lang === "en" ? "en" : "zh-CN"}
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
