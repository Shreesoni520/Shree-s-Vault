import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_TAGLINE}. Track income, spending, accounts, and recipes in one private desk.`,
  icons: {
    icon: { url: "/icon-light.png", type: "image/png" },
    apple: "/icon-light.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} dark h-full overflow-x-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
