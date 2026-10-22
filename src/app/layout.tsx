import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SeasonBar } from "@/components/SeasonBar";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["700", "800", "900"] });
const text = Schibsted_Grotesk({ variable: "--font-text", subsets: ["latin"] });
const num = IBM_Plex_Mono({ variable: "--font-num", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Raid: token armies on Strike",
  description:
    "Token communities claim Strike's markets by bringing it new traders who stay. Every score and every fee checks against Strike's public data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${num.variable}`}>
      <body className="min-h-dvh">
        <SiteHeader />
        <SeasonBar />
        {children}
      </body>
    </html>
  );
}
