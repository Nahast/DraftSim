import type { Metadata } from "next";
import { Barlow_Condensed, Public_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DraftSim",
  description: "Draft your fantasy team with a plan. Who to pick, and why, updated after every pick.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${publicSans.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <header className="flex h-14 flex-none print:hidden items-center border-b border-ink px-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Image src="/mark.svg" alt="" width={32} height={32} />
            <span className="font-display text-[22px] font-bold tracking-wide">DraftSim</span>
          </Link>
        </header>
        <Providers>
          <div className="flex-1">{children}</div>
        </Providers>
        <footer className="border-t border-rule px-4 py-4 text-xs text-muted print:hidden">
          ADP from{" "}
          <a className="underline" href="https://fantasyfootballcalculator.com">Fantasy Football Calculator</a>. Players from{" "}
          <a className="underline" href="https://sleeper.com">Sleeper</a>.
        </footer>
      </body>
    </html>
  );
}
