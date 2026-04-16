import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal | Physical Intelligence",
  description: "The world's first DePIN for Real-World Physical Intelligence on Solana.",
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
