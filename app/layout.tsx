import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TyagarajaRail } from "@/components/tyagaraja-rail";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = "https://www.raagasudhasabha.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Raaga Sudha Sabha — Indian Classical Music",
    template: "%s · Raaga Sudha Sabha",
  },
  description:
    "Raaga Sudha Sabha is a non-profit cultural arts organization preserving and promoting Indian classical music — for the rasika, for the artist, for the generations to come.",
  openGraph: {
    type: "website",
    siteName: "Raaga Sudha Sabha",
    url: SITE_URL,
    title: "Raaga Sudha Sabha — Indian Classical Music",
    description:
      "Preserving and promoting Indian classical music — for the rasika, for the artist, for the generations to come.",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-maroon focus:px-3 focus:py-2 focus:text-cream"
        >
          Skip to content
        </a>
        <CartProvider>
          <SiteNav />
          <main id="main" className="flex-1">
            {children}
          </main>
          <TyagarajaRail />
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
