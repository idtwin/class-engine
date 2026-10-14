"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./TopNav.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { soundEngine } from "../utils/soundEngine";

const HIDDEN_PATHS = new Set(["/join", "/play"]);

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, setSoundEnabled, theme, toggleTheme, classes, activeClassId, presentStudentIds } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined" && theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  if (!mounted) return null;

  const isHidden = Array.from(HIDDEN_PATHS).some((path) =>
    pathname === path || pathname.startsWith("/play/")
  );

  if (isHidden) return null;

  const GAME_PATHS = ["/category-sprint", "/fix-it", "/odd-one-out", "/jeopardy", "/rapid-fire", "/chain-reaction", "/hotseat", "/reveal", "/story", "/wyr", "/word-surge", "/prompts", "/wheel"];
  const isArcade = pathname.startsWith("/games") || GAME_PATHS.some((p) => pathname === p);
  const isRoster = pathname === "/teams";

  const activeClass = classes.find((c) => c.id === activeClassId);
  const activeStudentsCount = activeClass ? activeClass.students.filter((s) => presentStudentIds.includes(s.id)).length : 0;

  return (
    <header className={styles.navbar}>
      <div className={styles.container}>
        {/* BRAND LOGO */}
        <div
          className={styles.brand}
          onClick={() => {
            soundEngine.playClick(soundEnabled);
            router.push("/");
          }}
          onMouseEnter={() => soundEngine.playHover(soundEnabled)}
        >
          <div className={styles.brandIcon}>📖</div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>CLASS ENGINE</span>
            <span className={styles.brandSubtitle}>Teacher Studio</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className={styles.navGroup}>
          <button
            className={`${styles.navItem} ${pathname === "/" ? styles.active : ""}`}
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              router.push("/");
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
          >
            Lesson Hub
          </button>

          <button
            className={`${styles.navItem} ${pathname === "/activities" || isArcade ? styles.active : ""}`}
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              router.push("/activities");
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
          >
            Teaching Tools
          </button>

          <button
            className={`${styles.navItem} ${isRoster ? styles.active : ""}`}
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              router.push("/teams");
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
          >
            Squad Roster
          </button>
        </nav>

        {/* RIGHT CONTROLS */}
        <div className={styles.controls}>
          {/* STUDENT PRESENCE PILL */}
          <div className={styles.presencePill}>
            <span className={styles.dot} />
            <span>{activeStudentsCount} Students Present</span>
          </div>

          {/* THEME TOGGLE */}
          <button
            className={styles.iconBtn}
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              toggleTheme();
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Studio`}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          {/* SOUND TOGGLE */}
          <button
            className={styles.iconBtn}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Audio" : "Enable Audio"}
          >
            {soundEnabled ? "🔊 Sound On" : "🔇 Muted"}
          </button>
        </div>
      </div>
    </header>
  );
}
