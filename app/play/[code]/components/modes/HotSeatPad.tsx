"use client";

import React, { useState } from "react";
import styles from "./HotSeatPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Check, X, AlertTriangle, Bell, Zap } from "lucide-react";

interface HotSeatPadProps {
  currentWord?: string;
  forbiddenWords?: string[];
  currentIndex?: number;
  totalWords?: number;
  onScore: () => Promise<void> | void;
  onPass: () => Promise<void> | void;
  onTaboo: () => Promise<void> | void;
  onBuzz: () => Promise<void> | void;
}

export const HotSeatPad: React.FC<HotSeatPadProps> = ({
  currentWord = "HOT SEAT OPERATOR",
  forbiddenWords = [],
  currentIndex = 1,
  totalWords = 1,
  onScore,
  onPass,
  onTaboo,
  onBuzz,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerFeedback = (text: string) => {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 700);
  };

  const handleScore = async () => {
    triggerHaptic("burst");
    triggerFeedback("+100 PTS! ✓");
    await onScore();
  };

  const handlePass = async () => {
    triggerHaptic("tap");
    triggerFeedback("PASSED ⏭");
    await onPass();
  };

  const handleTaboo = async () => {
    triggerHaptic("warning");
    triggerFeedback("TABOO! -50 ⚠️");
    await onTaboo();
  };

  const handleBuzz = async () => {
    triggerHaptic("burst");
    triggerFeedback("BUZZED! 🚨");
    await onBuzz();
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// THE HOT SEAT // TACTICAL CONTROLLER</span>
        {totalWords > 1 && <span>ROUND {currentIndex} / {totalWords}</span>}
      </div>

      {/* Target Word Clue Card */}
      <div className={styles.wordCard}>
        <span className={styles.wordLabel}>
          {feedback ? feedback : "TARGET WORD (DESCRIBE TO SQUAD)"}
        </span>
        <div className={styles.wordMain}>{currentWord}</div>

        {/* Forbidden Taboo Words */}
        {forbiddenWords.length > 0 && (
          <div className={styles.forbiddenBox}>
            <div className={styles.forbiddenLabel}>
              <AlertTriangle size={12} /> DO NOT SAY THESE WORDS:
            </div>
            <div className={styles.forbiddenList}>
              {forbiddenWords.map((w, idx) => (
                <span key={idx} className={styles.forbiddenChip}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tactical Control Buttons */}
      <div className={styles.controlGrid}>
        <button
          onClick={handleScore}
          className={`${styles.btnControl} ${styles.btnScore}`}
        >
          <Check size={20} />
          <span>CORRECT / SQUAD POINT (+100)</span>
        </button>

        <button
          onClick={handlePass}
          className={`${styles.btnControl} ${styles.btnPass}`}
        >
          <X size={16} />
          <span>PASS / NEXT WORD</span>
        </button>

        <button
          onClick={handleTaboo}
          className={`${styles.btnControl} ${styles.btnTaboo}`}
        >
          <AlertTriangle size={16} />
          <span>TABOO FOUL (-50)</span>
        </button>

        <button
          onClick={handleBuzz}
          className={`${styles.btnControl} ${styles.btnBuzzer}`}
        >
          <Bell size={16} />
          <span>TACTICAL SQUAD BUZZER 🚨</span>
        </button>
      </div>
    </div>
  );
};
