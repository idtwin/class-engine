import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import TwistOverlay from "./components/TwistOverlay";
import TopNav from "./components/TopNav";
import RankUpToast from "./components/RankUpToast";
import ScoreboardOverlay from "./components/ScoreboardOverlay";

const inter = Inter({
  variable: "--font-inter",
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
  title: "Class Engine 3.0 | Teacher Studio",
  description: "Pedagogy-First Gamified Classroom Learning Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${nunito.variable}`}>
      <body>
        <TopNav />
        <ScoreboardOverlay />
        <main className="main-content">
          {children}
        </main>
        <TwistOverlay />
        <RankUpToast />
      </body>
    </html>
  );
}
