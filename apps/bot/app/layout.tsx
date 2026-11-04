import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import ClientNavBar from "../components/ClientNavBar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://signal-bot-chi.vercel.app'),
  title: "Signal | Prices go public. You don't.",
  description: "Snap a receipt in Telegram. NEAR AI reads it inside a secure enclave, NEAR verifies the signature on-chain, and Solana pays you in USDC. Only city, date and prices are published.",
  openGraph: {
    title: "Signal | Prices go public. You don't.",
    description: "Real-world prices, read by an attested AI, verified on NEAR, paid on Solana. No wallet setup required.",
    type: "website",
    siteName: "Signal Bot",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal | Prices go public. You don't.",
    description: "Real-world prices, read by an attested AI, verified on NEAR, paid on Solana.",
  },
};

import { ThemeProvider } from "../components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* pt-20 clears the floating navbar (top-3 + h-14/h-16) so page headers aren't covered */}
      <body className="min-h-full flex flex-col pt-20 transition-colors duration-300">
        <ThemeProvider>
          <ClientNavBar />
          <main className="flex-grow flex flex-col relative z-0">
            {children}
          </main>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
