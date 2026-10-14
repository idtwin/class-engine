"use client";

import React, { useState } from "react";
import styles from "./JeopardyPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Bell, Lock } from "lucide-react";

interface JeopardyPadProps {
  category?: string;
  points?: number;
  questionText?: string;
  isLockedOut?: boolean;
  lockedOutBy?: string;
  teamColor?: string;
  onBuzz: () => Promise<void> | void;
}

export const JeopardyPad: React.FC<JeopardyPadProps> = ({
  category,
  points,
  questionText,
  isLockedOut = false,
  lockedOutBy,
  teamColor = "#00c8f0",
  onBuzz,
}) => {
  const [buzzed, setBuzzed] = useState(false);

  const handleBuzz = async () => {
    if (isLockedOut) return;
    triggerHaptic("burst");
    setBuzzed(true);
    setTimeout(() => setBuzzed(false), 2000);
    await onBuzz();
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// JEOPARDY // SQUAD CONSOLE</span>
        <span>{points ? `${points} PTS` : "STANDBY"}</span>
      </div>

      {/* Target Tile Info */}
      <div className={styles.tileCard}>
        {category ? (
          <>
            <div className={styles.categoryTag}>{category}</div>
            {points && <div className={styles.pointsBadge}>{points} PTS</div>}
            {questionText ? (
              <div className={styles.questionText}>{questionText}</div>
            ) : (
              <div className={styles.waitingPrompt}>EXAMINE PROJECTOR SCREEN FOR QUESTION</div>
            )}
          </>
        ) : (
          <div className={styles.waitingPrompt}>
            AWAITING TILE SELECTION ON COMMAND BRIDGE...
          </div>
        )}
      </div>

      {/* Massive Tactical Buzzer */}
      <div className={styles.buzzerWrap}>
        <button
          className={styles.buzzerBtn}
          onClick={handleBuzz}
          disabled={isLockedOut}
          style={
            teamColor
              ? {
                  background: isLockedOut
                    ? "#1e293b"
                    : `radial-gradient(circle, ${teamColor} 0%, #0f172a 100%)`,
                  borderColor: isLockedOut ? "#475569" : teamColor,
                }
              : {}
          }
        >
          {isLockedOut ? (
            <>
              <Lock size={32} color="#94a3b8" />
              <span className={styles.buzzerText}>LOCKED OUT</span>
            </>
          ) : (
            <>
              <Bell size={32} color="#ffffff" />
              <span className={styles.buzzerText}>{buzzed ? "BUZZED!" : "STRIKE BUZZER"}</span>
            </>
          )}
        </button>

        {isLockedOut && (
          <div className={styles.lockoutWarning}>
            ⚠️ BUZZER LOCKED OUT BY {lockedOutBy || "ANOTHER SQUAD"}
          </div>
        )}
      </div>
    </div>
  );
};
