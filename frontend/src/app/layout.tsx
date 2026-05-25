import type { Metadata } from "next";
import "@/styles/globals.css";

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
        {/* TODO: Wrap with providers once they're implemented
            <ThemeProvider>
              <WalletProvider>
                <ContractProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </ContractProvider>
              </WalletProvider>
            </ThemeProvider>
        */}
        {children}
      </body>
    </html>
  );
}
