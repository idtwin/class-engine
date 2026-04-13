"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./TopNav.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Volume2, VolumeX, ArrowLeft, LayoutGrid, Cpu } from "lucide-react";

const HIDDEN_PATHS = new Set(["/", "/join", "/play"]);

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, setSoundEnabled } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  
  // Clean paths check
  const isHidden = Array.from(HIDDEN_PATHS).some(path => 
    pathname === path || pathname.startsWith("/play/")
  );
  if (isHidden) return null;

  return (
    <div className={styles.topNavWrapper}>
      <header className={styles.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {pathname !== '/games' && (
            <button 
              onClick={() => router.push('/games')} 
              className={styles.topBackBtn}
              title="Return to Launchpad"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 255, 65, 0.1)', border: '1px solid #00FF41', padding: '6px', borderRadius: '4px' }}>
                <LayoutGrid size={20} color="#00FF41" strokeWidth={2.5} />
              </div>
            </button>
          )}
          <div className={styles.logo} onClick={() => router.push("/games")} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'rgba(0, 255, 65, 0.1)', border: '1px solid #00FF41', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={18} color="#00FF41" strokeWidth={2.5} />
            </div>
            ARCADE_COMMAND
          </div>
        </div>
        
        <nav className={styles.links}>
          <button 
            className={`${styles.navLink} ${pathname.startsWith("/games") || pathname === "/fix-it" ? styles.active : ""}`}
            onClick={() => router.push("/games")}
          >
            ARCADE
          </button>
          <button 
            className={`${styles.navLink} ${pathname === "/teams" ? styles.active : ""}`}
            onClick={() => router.push("/teams")}
          >
            TEAMS & ROSTER
          </button>
          <button 
            className={`${styles.navLink} ${pathname === "/dashboard" ? styles.active : ""}`}
            onClick={() => router.push("/dashboard")}
          >
            ANALYTICS
          </button>
        </nav>

        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={styles.muteBtn}
          title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
          style={{ width: 'auto', padding: '0 1rem', fontFamily: 'monospace', gap: '0.5rem', fontWeight: 700 }}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {soundEnabled ? "SOUND: ON" : "SOUND: OFF"}
        </button>
      </header>
      <div className={styles.neonDivider}></div>
    </div>
  );
}
