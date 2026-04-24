"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./TopNav.module.css";
import { useClassroomStore } from "../store/useClassroomStore";

const HIDDEN_PATHS = new Set(["/", "/join", "/play"]);

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, setSoundEnabled, classes, activeClassId, presentStudentIds } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  
  const isHidden = Array.from(HIDDEN_PATHS).some(path => 
    pathname === path || pathname.startsWith("/play/")
  );
  
  if (isHidden) return null;

  // Route markers
  const GAME_PATHS = ["/fix-it","/odd-one-out","/jeopardy","/rapid-fire","/chain-reaction","/hotseat","/reveal","/story","/wyr","/prompts","/wheel"];
  const isArcade = pathname.startsWith("/games") || GAME_PATHS.some(p => pathname === p);
  const isTeams = pathname === "/teams";
  const isAnalytics = pathname === "/dashboard";

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <nav className={styles.nav}>
      {/* Left HUD Corner */}
      <div className={styles.hudCornerLeft} />
      
      <div 
        className={styles.navBrand} 
        onClick={() => router.push("/games")}
      >
        <div className={styles.brandIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandMain}>ESL ARENA V2.0</span>
          <span className={styles.brandSub}>COMMAND BRIDGE</span>
        </div>
      </div>
      
      <ul className={styles.navLinks}>
        <li>
          <button 
            className={`${styles.navLink} ${isArcade ? styles.active : ""}`}
            onClick={() => router.push("/games")}
          >
            <span className={styles.linkText}>Arcade</span>
            {isArcade && <span className={styles.activeIndicator} />}
          </button>
        </li>
        <li>
          <button 
            className={`${styles.navLink} ${isTeams ? styles.active : ""}`}
            onClick={() => router.push("/teams")}
          >
            <span className={styles.linkText}>Teams & Roster</span>
            {isTeams && <span className={styles.activeIndicator} />}
          </button>
        </li>
        <li>
          <button 
            className={`${styles.navLink} ${isAnalytics ? styles.active : ""}`}
            onClick={() => router.push("/dashboard")}
          >
            <span className={styles.linkText}>Analytics</span>
            {isAnalytics && <span className={styles.activeIndicator} />}
          </button>
        </li>
      </ul>

      <div className={styles.navRight}>
        <div className={styles.statusGroup}>
          {/* 1. Squad Strength */}
          <div className={styles.statusPanel}>
            <span className={styles.statusLabel}>SQUAD_STRENGTH</span>
            <span className={styles.statusValue}>
              <span className={styles.statusDot} />
              {activeClass ? `${activeClass.students.filter(s => presentStudentIds.includes(s.id)).length} PERSONNEL` : "OFFLINE"}
            </span>
          </div>

          {/* 2. Uplink Status */}
          <div className={styles.statusPanel}>
            <span className={styles.statusLabel}>UPLINK_STATUS</span>
            <span className={styles.statusValue}>
              <span className={styles.statusDot} style={{ background: '#00ffd5', boxShadow: '0 0 8px #00ffd5' }} />
              STABLE
            </span>
          </div>

          {/* 3. Session Time */}
          <div className={styles.statusPanel}>
            <span className={styles.statusLabel}>SESSION_TIME</span>
            <span className={styles.statusValue}>
              <SessionTimer />
            </span>
          </div>

          {/* 4. Agent Comms (Sound) */}
          <div className={styles.statusPanel}>
            <span className={styles.statusLabel}>Agent Comms</span>
            <span className={styles.statusValue}>
              <span className={soundEnabled ? styles.statusDot : styles.statusDotOff} />
              {soundEnabled ? "ACTIVE" : "MUTED"}
            </span>
          </div>
        </div>

        <button 
          className={styles.soundToggle}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* Right HUD Corner */}
      <div className={styles.hudCornerRight} />
    </nav>
  );
}
function SessionTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return <span>{formatTime(seconds)}</span>;
}
