import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Livestock Chain — Цифровой учёт скота",
  description:
    "Платформа цифрового учёта и торговли скотом в Казахстане на базе блокчейна Solana. Прозрачность, верификация и безопасные сделки.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-steppe-100 border-b border-steppe-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-xl text-forest-600 hover:text-forest-500 transition-colors shrink-0"
              >
                <span className="text-2xl">🐂</span>
                <span className="hidden sm:inline">Livestock Chain</span>
                <span className="sm:hidden">LC</span>
              </Link>

              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/">Главная</NavLink>
                <NavLink href="/my-animals">Мои животные</NavLink>
                <NavLink href="/register">Регистрация</NavLink>
                <NavLink href="/marketplace">Маркетплейс</NavLink>
              </div>

              {/* Mobile horizontal scroll links */}
              <div className="flex md:hidden items-center gap-1 overflow-x-auto no-scrollbar">
                <NavLink href="/">Главная</NavLink>
                <NavLink href="/my-animals">Животные</NavLink>
                <NavLink href="/register">Регистрация</NavLink>
                <NavLink href="/marketplace">Маркетплейс</NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>

        {/* Footer */}
        <footer className="bg-forest-600 text-steppe-100 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm opacity-80">
              &copy; 2026 Livestock Chain — Казахстан
            </p>
            <p className="text-xs opacity-60">Powered by Solana</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg text-sm font-medium text-forest-600 hover:bg-steppe-200 transition-colors whitespace-nowrap"
    >
      {children}
    </Link>
  );
}
