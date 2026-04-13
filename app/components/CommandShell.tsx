"use client";

import React, { useEffect, useState } from "react";
import styles from "./CommandShell.module.css";
import { useRouter, usePathname } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import { Rocket, LayoutDashboard, Users, Settings, Volume2, VolumeX, Hexagon, ArrowLeft } from "lucide-react";

interface CommandShellProps {
  children: React.ReactNode;
  showScoreboardMargin?: boolean;
}

export default function CommandShell({ children, showScoreboardMargin = true }: CommandShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, setSoundEnabled } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className={styles.shellContainer}>
      {/* 80px Collapsed Control Panel */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <Hexagon size={32} />
          </div>
          
          {/* Universal Back Button */}
          <button 
            className={styles.iconBtn} 
            onClick={() => router.back()}
            title="Go Back"
            style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '0' }}
          >
            <ArrowLeft size={24} />
          </button>

          <button 
            className={`${styles.iconBtn} ${pathname === "/games" ? styles.active : ""}`} 
            onClick={() => router.push("/games")}
            title="Launchpad"
          >
            <Rocket size={24} />
          </button>
          <button 
            className={`${styles.iconBtn} ${pathname === "/teams" ? styles.active : ""}`} 
            onClick={() => router.push("/teams")}
            title="Roster"
          >
            <Users size={24} />
          </button>
          <button 
            className={`${styles.iconBtn} ${pathname === "/dashboard" ? styles.active : ""}`} 
            onClick={() => window.open("/dashboard", "_blank")}
            title="Host Dashboard"
          >
            <LayoutDashboard size={24} />
          </button>
        </div>

        <div className={styles.sidebarBottom}>
          <button 
            className={styles.iconBtn} 
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
            style={{ color: soundEnabled ? "var(--accent)" : "#ef4444" }}
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <button className={styles.iconBtn} title="System Settings">
            <Settings size={24} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainArea}>
        <div className={`${styles.contentWrapper} ${showScoreboardMargin ? styles.contentWithScoreboard : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
