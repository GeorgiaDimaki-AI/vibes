import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zeitgeist - Your Cultural Advisor",
  description: "Get culturally-aware advice on topics, behavior, and style for any situation. Navigate the zeitgeist with confidence.",
  keywords: ["cultural advice", "social situations", "zeitgeist", "trends", "behavior guidance"],
  authors: [{ name: "Zeitgeist" }],
  openGraph: {
    title: "Zeitgeist - Your Cultural Advisor",
    description: "Get culturally-aware advice on topics, behavior, and style for any situation. Navigate the zeitgeist with confidence.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeitgeist - Your Cultural Advisor",
    description: "Navigate any social situation with culturally-aware advice",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ToastProvider />
          <OnboardingCheck />
          <KeyboardShortcutsProvider />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
