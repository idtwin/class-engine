"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./TopNav.module.css";
import { useClassroomStore } from "../store/useClassroomStore";

const HIDDEN_PATHS = new Set(["/", "/join", "/play"]);

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, setSoundEnabled } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  
  const isHidden = Array.from(HIDDEN_PATHS).some(path => 
    pathname === path || pathname.startsWith("/play/")
  );
  if (isHidden) return null;

  // Route markers
  const isArcade = pathname.startsWith("/games") || pathname === "/fix-it";
  const isTeams = pathname === "/teams";
  const isAnalytics = pathname === "/dashboard";

  return (
    <nav className={styles.nav}>
      <div 
        className={styles.navBrand} 
        onClick={() => router.push("/games")}
      >
        <div className={styles.navBrandIcon}>⊞</div>
        ARCADE_COMMAND
      </div>
      
      <ul className={styles.navLinks}>
        <li>
          <button 
            className={`${styles.navLink} ${isArcade ? styles.active : ""}`}
            style={isArcade ? ({ "--accent": "var(--orange)" } as React.CSSProperties) : {}}
            onClick={() => router.push("/games")}
          >
            Arcade
          </button>
        </li>
        <li>
          <button 
            className={`${styles.navLink} ${isTeams ? styles.active : ""}`}
            style={isTeams ? ({ "--accent": "var(--cyan)" } as React.CSSProperties) : {}}
            onClick={() => router.push("/teams")}
          >
            Teams & Roster
          </button>
        </li>
        <li>
          <button 
            className={`${styles.navLink} ${isAnalytics ? styles.active : ""}`}
            style={isAnalytics ? ({ "--accent": "var(--purple)" } as React.CSSProperties) : {}}
            onClick={() => router.push("/dashboard")}
          >
            Analytics
          </button>
        </li>
      </ul>

      <button 
        className={styles.navRight}
        onClick={() => setSoundEnabled(!soundEnabled)}
      >
        <div className={soundEnabled ? styles.soundDot : styles.soundDotOff}></div>
        {soundEnabled ? "SOUND: ON" : "SOUND: OFF"}
      </button>
    </nav>
  );
}
