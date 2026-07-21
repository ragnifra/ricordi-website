import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ricordi Archive",
    template: "%s — Ricordi Archive",
  },
  description:
    "Archivio di pezzi irripetibili — luxury fashion e high-end streetwear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
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
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
