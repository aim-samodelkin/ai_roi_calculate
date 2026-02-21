import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { AuthProvider } from "@/components/auth/auth-provider";

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
      <body className="min-h-screen bg-background antialiased flex flex-col">
        <AuthProvider>
          <AppHeader />
          <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">{children}</main>
          <AppFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
