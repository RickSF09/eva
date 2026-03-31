import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/components/auth/AuthProvider'
import { DAILYFRIEND_LOGOS } from '@/config/branding'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "DailyFriend - Because everyone deserves a friend",
  description: "Comprehensive AI voice assistant platform for elder care and family peace of mind",
  icons: {
    icon: DAILYFRIEND_LOGOS.favicon,
    shortcut: DAILYFRIEND_LOGOS.favicon,
    apple: DAILYFRIEND_LOGOS.iconGradient,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
