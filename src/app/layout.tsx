import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { AuthProvider } from "@/components/auth/auth-provider";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "AI ROI Calculator. AIMintegrations",
  description: "Сервис расчета окупаемости внедрения ИИ.",
  openGraph: {
    title: "AI ROI Calculator. AIMintegrations",
    description: "Сервис расчета окупаемости внедрения ИИ.",
    type: "website",
    siteName: "AIMintegrations",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI ROI Calculator. AIMintegrations",
    description: "Сервис расчета окупаемости внедрения ИИ.",
  },
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
