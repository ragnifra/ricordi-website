import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getCopy, getLanguage } from "@/lib/i18n/server";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Follows the request's language. Crawlers always get Italian (see
// src/lib/i18n/server.ts), so the Italian description is what gets indexed.
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: {
      default: copy.meta.siteName,
      template: `%s — ${copy.meta.siteName}`,
    },
    description: copy.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLanguage();
  const copy = await getCopy();

  return (
    <html
      lang={lang}
      className={cn("dark", "h-full", "antialiased", geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Iubenda cookie consent/blocking script — must load beforeInteractive
            so it can gate later analytics/pixel scripts. Next.js hoists
            beforeInteractive scripts into <head> regardless of JSX position. */}
        <Script
          src="https://embeds.iubenda.com/widgets/d440bf5a-ef1a-461a-96ae-645e7e8b94e4.js"
          strategy="beforeInteractive"
        />
        <LanguageProvider lang={lang} copy={copy}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
