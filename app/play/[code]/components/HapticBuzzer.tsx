"use client";

import React, { useState } from "react";
import styles from "./HapticBuzzer.module.css";
import { triggerHaptic } from "../hooks/useHapticFeedback";

interface HapticBuzzerProps {
  isLockedOut?: boolean;
  lockedOutBy?: string;
  onBuzz: () => Promise<void> | void;
  teamColor?: string;
}

export const HapticBuzzer: React.FC<HapticBuzzerProps> = ({
  isLockedOut = false,
  lockedOutBy,
  onBuzz,
  teamColor = "#00ffd5",
}) => {
  const [pressed, setPressed] = useState(false);
  const [buzzed, setBuzzed] = useState(false);

  const handlePress = async () => {
    if (isLockedOut || buzzed) {
      triggerHaptic("lockout");
      return;
    }
    triggerHaptic("buzz");
    setPressed(true);
    setBuzzed(true);
    await onBuzz();
    setTimeout(() => setPressed(false), 200);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.statusRow}>
        {isLockedOut ? (
          <span className={styles.statusLocked}>
            LOCKOUT // {lockedOutBy || "RIVAL TEAM"} FIRST
          </span>
        ) : buzzed ? (
          <span className={styles.statusSignal}>SIGNAL TRANSMITTED // WAIT HOST</span>
        ) : (
          <span className={styles.statusReady}>SYSTEM ARMED // TAP TO TRIGGER</span>
        )}
      </div>

      <button
        onClick={handlePress}
        disabled={isLockedOut || buzzed}
        className={`${styles.buzzerButton} ${
          isLockedOut
            ? styles.buzzerLocked
            : buzzed
            ? styles.buzzerTransmitted
            : pressed
            ? styles.buzzerPressed
            : ""
        }`}
        style={{
          boxShadow: isLockedOut
            ? "none"
            : `0 10px 30px ${teamColor}33, inset 0 0 15px ${teamColor}22`,
          borderColor: isLockedOut ? "#331a22" : teamColor,
        }}
      >
        <div className={styles.innerRing}>
          <span className={styles.icon}>
            {isLockedOut ? "⛔" : buzzed ? "📡" : "⚡"}
          </span>
          <span className={styles.label}>
            {isLockedOut ? "LOCKED" : buzzed ? "BUZZED" : "BUZZ IN"}
          </span>
          <span className={styles.telemetry}>[PRIMARY TRIGGER]</span>
        </div>
      </button>
    </div>
  );
};
