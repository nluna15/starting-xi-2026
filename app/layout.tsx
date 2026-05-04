import type { Metadata } from "next";
import { Bebas_Neue, Barlow_Condensed, Barlow, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components/chrome/footer";
import { Header } from "@/components/chrome/header";
import "./globals.css";

// Display — single weight (Bebas Neue ships only 400).
const fontDisplay = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Condensed — buttons, eyebrows, name plates. Limited to the weights we use.
const fontCondensed = Barlow_Condensed({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Sans — body copy / form input.
const fontSans = Barlow({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono — stat values, codes, tabular numerals. Variable font, axis-driven.
const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Build Your XI",
  description:
    "Pick a country and build their starting 11 + bench for the 2026 FIFA World Cup. Compare your picks against the wisdom of the crowd.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${fontDisplay.variable} ${fontCondensed.variable} ${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <Header />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
