import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const SITE_URL = "https://brochure-generator-silk.vercel.app";
const TITLE = "Brochure Generator — Paste a URL, get a branded brochure";
const DESC =
  "AI-generated PDF brochures in the company's real colors and voice. Scrapes the site's CSS palette, picks a design vibe, renders a custom PDF. Free, ~15 seconds, no signup.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    siteName: "Brochure Generator",
    type: "website",
    // The auto-generated image from opengraph-image.tsx is added by Next.js
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0B0F] text-white">
        {children}
      </body>
    </html>
  );
}
