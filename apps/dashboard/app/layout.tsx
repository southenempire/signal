import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal | The Human-Powered Oracle",
  description: "Signal is a DePIN network on Solana. Earn USDC by reporting real-world prices via Telegram. Vision AI verified.",
  openGraph: {
    title: "Signal | Physical Intelligence on Solana",
    description: "Earn USDC reporting real-world data directly from Telegram. No wallet setup required.",
    type: "website",
    siteName: "Signal Protocol",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal | The Human-Powered Oracle",
    description: "Earn USDC by reporting real-world prices via Telegram.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
