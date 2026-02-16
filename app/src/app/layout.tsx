import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ClientProviders } from "@/components/ClientProviders";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostOdds — Predict. Trade. No trace.",
  description: "Decentralized crypto prediction markets on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
      >
        <ClientProviders>
          <ToastProvider>
            <Navbar />
            <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20 pb-12">
              {children}
            </main>
          </ToastProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
