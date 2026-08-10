import type { Metadata } from "next";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "en" ? "Ismism Test · Philosophical Tendency" : "主义主义哲学倾向测试",
    description: lang === "en"
      ? "A playful test of philosophical tendencies across Field, Ontology, and Phenomenon."
      : "测试用户在场域、本体、现象三条哲学轴线上的倾向。",
  };
}

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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
