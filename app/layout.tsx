import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TwistOverlay from "./components/TwistOverlay";
import ScoreboardOverlay from "./components/ScoreboardOverlay";
import TopNav from "./components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ayo!",
  description: "The Classroom Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <TopNav />
        {children}
        <TwistOverlay />
        <ScoreboardOverlay />
      </body>
    </html>
  );
}
