import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#10b981", // Emerald accent color
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Shekify - Premium Music Player",
  description:
    "Experience high-fidelity offline audio playback, local caching, and seamless playlist management with Shekify. Designed for audiophiles who value local music storage.",
  keywords: [
    "music player",
    "offline audio",
    "IndexedDB cache",
    "Next.js audio player",
    "Shekify",
    "local music manager",
  ],
  authors: [{ name: "Kaif Shaikh" }],
  icons: {
    icon: "/app-logo.svg",
    shortcut: "/app-logo.svg",
    apple: "/app-logo.svg",
  },
  openGraph: {
    title: "Shekify - Premium Music Player",
    description:
      "Experience high-fidelity offline audio playback, local caching, and seamless playlist management with Shekify. Designed for audiophiles who value local music storage.",
    siteName: "Shekify",
    type: "website",
    images: [
      {
        url: "/app-logo.svg",
        width: 800,
        height: 800,
        alt: "Shekify Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shekify - Premium Music Player",
    description:
      "Experience high-fidelity offline audio playback, local caching, and seamless playlist management with Shekify.",
    images: ["/app-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
