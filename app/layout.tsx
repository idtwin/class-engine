import type { Metadata } from "next";
import { Syne, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import TwistOverlay from "./components/TwistOverlay";
import ScoreboardOverlay from "./components/ScoreboardOverlay";
import TopNav from "./components/TopNav";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
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
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${nunito.variable}`}>
      <body>
        <TopNav />
        {children}
        <TwistOverlay />
        <ScoreboardOverlay />
      </body>
    </html>
  );
}
