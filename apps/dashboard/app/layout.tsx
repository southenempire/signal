import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Bot | Human-Powered Oracle on Solana",
  description: "Signal Bot is a DePIN oracle network on Solana. Report real-world prices via Telegram and earn USDC. Vision AI verified, no crypto experience needed.",
  openGraph: {
    title: "Signal Bot | Human-Powered Oracle on Solana",
    description: "Earn USDC reporting real-world data directly from Telegram. No wallet setup required.",
    type: "website",
    siteName: "Signal Bot",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal Bot | Human-Powered Oracle on Solana",
    description: "Report real-world prices via Telegram. Earn USDC on Solana. Vision AI verified.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark bg-black">
      <body className="min-h-full flex flex-col pt-16">
        <NavBar />
        <main className="flex-grow flex flex-col relativ z-0">
          {children}
        </main>
      </body>
    </html>
  );
}
