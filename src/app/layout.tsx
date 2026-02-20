import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "AI ROI Calculator",
  description: "Расчёт окупаемости внедрения ИИ-решений в бизнес-процессы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background antialiased">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
      </body>
    </html>
  );
}
