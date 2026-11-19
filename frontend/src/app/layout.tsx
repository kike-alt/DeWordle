import type { Metadata, Viewport } from "next";
import { Geist, Inter, Plus_Jakarta_Sans, Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../../context/AuthContext";
import Header from "@/components/header";
import { StellarWalletProvider } from "@/providers/stellar-wallet-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { ToastViewport } from "@/components/ToastViewport";
import { AchievementCelebration } from "@/components/AchievementCelebration";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { SessionRecoveryToast } from "@/components/SessionRecoveryToast";
import { ZoomRoot } from "@/components/ZoomRoot";
import { NO_FLASH_SCRIPT } from "@/lib/theme";
import { OnboardingProvider } from "@/providers/onboarding-provider";
import { buildCsp, cspOptionsFromEnv } from "@/lib/csp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta-sans",
  display: "swap",
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
  manifest: "/manifest.json",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        {/* Same policy as the middleware header; see src/lib/csp.ts */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={buildCsp({ ...cspOptionsFromEnv(process.env), forMeta: true })}
        />
      </head>
      <body
        className={`${geistSans.variable} ${inter.variable} ${robotoMono.variable} ${jakartaSans.variable} ${clashDisplay.variable} antialiased hide-scrollbar`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-primary-950 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to content
        </a>
        <StellarWalletProvider>
          <OnboardingProvider>
            <SettingsProvider>
              <AuthProvider>
                <Header />
                <AchievementCelebration />
                <PwaInstallBanner />
                <SessionRecoveryToast />
                <ToastViewport />
                <main
                  id="main-content"
                  tabIndex={-1}
                  className="flex flex-col relative w-full bg-primary-950 min-h-screen h-full overflow-x-hidden hide-scrollbar focus:outline-none"
                >
                  <ZoomRoot>{children}</ZoomRoot>
                </main>
              </AuthProvider>
            </SettingsProvider>
          </OnboardingProvider>
        </StellarWalletProvider>
      </body>
    </html>
  );
}