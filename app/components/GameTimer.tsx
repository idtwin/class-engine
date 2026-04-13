"use client";
import { useEffect, useRef } from "react";
import styles from "./GameTimer.module.css";
import { playSFX, stopSFX } from "../lib/audio";

interface GameTimerProps {
  timeLeft?: number;
  totalTime?: number;
  showTimesUp?: boolean;
  variant?: "bar" | "circle";
  label?: string;
  className?: string;
  [key: string]: any;
}

export default function GameTimer({
  timeLeft = 0,
  totalTime = 0,
  showTimesUp = false,
  variant = "bar",
  label,
  className = "",
}: GameTimerProps) {

  // ── Color logic (shared) ─────────────────────────────
  const getColor = () => {
    if (timeLeft <= 5) return "#FF2D78";   // danger   — magenta
    if (timeLeft <= 10) return "#FFB800";   // warning  — amber
    return "#00FF41";                        // normal   — neon green
  };

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;

  // ── Audio SFX ────────────────────────────────────────
  const lastPlayedRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && timeLeft !== lastPlayedRef.current) {
      playSFX("tick");
      lastPlayedRef.current = timeLeft;
    }
    if (timeLeft === 0 && lastPlayedRef.current !== 0) {
      playSFX("times-up");
      lastPlayedRef.current = 0;
    }
    return () => {
      if (timeLeft === 0) stopSFX("times-up");
      stopSFX("tick");
    };
  }, [timeLeft]);

  // ── TIME'S UP overlay (both variants) ─────────────────
  if (showTimesUp) {
    return (
      <div className={styles.timesUpOverlay}>
        <div className={styles.timesUpContent}>
          <div className={styles.timesUpIcon}>⏰</div>
          <h1 className={styles.timesUpText}>TIME&apos;S UP!</h1>
        </div>
      </div>
    );
  }

  // ── Circle variant (Jeopardy modal) ───────────────────
  if (variant === "circle") {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    const color = getColor();

    return (
      <div className={`${styles.timerContainer} ${timeLeft <= 5 ? styles.pulse : ""} ${className}`}>
        <svg className={styles.ring} viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <div className={styles.timerNumber} style={{ color }}>
          {timeLeft}
        </div>
      </div>
    );
  }

  // ── Bar variant (fixed top of game screen) ────────────
  const color = getColor();
  const isCritical = timeLeft <= 5;

  return (
    <div className={`${styles.timerBar} ${isCritical ? styles.barPulse : ""}`}>
      <div className={styles.timerBarInner}>
        {label && <span className={styles.timerBarLabel}>{label}</span>}
        <div className={styles.timerBarNumber} style={{ color }}>
          {timeLeft}
        </div>
      </div>
      <div className={styles.timerBarTrack}>
        <div
          className={styles.timerBarFill}
          style={{
            width: `${progress * 100}%`,
            background: color,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}
