import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { KeyBalanceProvider } from "@/providers/KeyBalanceProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SearchProvider } from "@/providers/SearchProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "KeyChain — Decentralized Game License Platform",
  description:
    "Own your games. Trade your licenses. Every transfer is on-chain.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <WalletProvider>
            <KeyBalanceProvider>
              <ToastProvider>
                <SearchProvider>
                  <Navbar />
                  {children}
                </SearchProvider>
              </ToastProvider>
            </KeyBalanceProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
