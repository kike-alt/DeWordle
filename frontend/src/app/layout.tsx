import type { Metadata, Viewport } from "next";
import { Geist, Inter, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../../context/AuthContext";
import Header from "@/components/header";
import { StellarWalletProvider } from "@/providers/stellar-wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta-sans",
});

const clashDisplay = localFont({
  src: [
    {
      path: "../fonts/ClashDisplay-Variable.ttf",
      weight: "400,500,600,700",
      style: "normal",
    },
  ],
  variable: "--font-clash-display",
});

export const metadata: Metadata = {
  title: "DeWordle",
  description: "Soroban-native word game migration foundation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${inter.variable} ${jakartaSans.variable} ${clashDisplay.variable} antialiased hide-scrollbar`}
      >
        <StellarWalletProvider>
          <AuthProvider>
            <Header />
            <main className="flex flex-col relative w-full bg-primary-950 min-h-screen h-full overflow-x-hidden hide-scrollbar">
              {children}
            </main>
          </AuthProvider>
        </StellarWalletProvider>
      </body>
    </html>
  );
}
