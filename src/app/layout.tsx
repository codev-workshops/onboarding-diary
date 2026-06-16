import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";
import { CacheProvider } from "@/contexts/CacheContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura (ඔරා) — Your Kapruka Shopping Buddy",
  description:
    "Aura (ඔරා) — AI-powered conversational shopping companion from the divine Kapruka tree. Browse products, compare options, check delivery, and order — all through natural conversation.",
  keywords: ["Kapruka", "shopping", "AI", "Sri Lanka", "e-commerce"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <CacheProvider>
              <CartProvider>
                <ChatHistoryProvider>{children}</ChatHistoryProvider>
              </CartProvider>
            </CacheProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
