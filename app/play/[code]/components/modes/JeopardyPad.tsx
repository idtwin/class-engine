"use client";

import React, { useState, useEffect } from "react";
import styles from "./JeopardyPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Bell, Lock, Send, Check } from "lucide-react";

interface JeopardyPadProps {
  category?: string;
  points?: number;
  questionText?: string;
  isLockedOut?: boolean;
  lockedOutBy?: string;
  teamColor?: string;
  onBuzz: () => Promise<void> | void;
  onAnswer?: (answer: string) => Promise<void> | void;
}

export const JeopardyPad: React.FC<JeopardyPadProps> = ({
  category,
  points,
  questionText,
  isLockedOut = false,
  lockedOutBy,
  teamColor = "#00c8f0",
  onBuzz,
  onAnswer,
}) => {
  const [buzzed, setBuzzed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [sentAnswer, setSentAnswer] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Reset answer when a new question tile is selected
  useEffect(() => {
    setTypedAnswer("");
    setSentAnswer(null);
    setBuzzed(false);
  }, [category, points, questionText]);

  const handleBuzz = async () => {
    if (isLockedOut) return;
    triggerHaptic("burst");
    setBuzzed(true);
    await onBuzz();
  };

  const handleSendAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = typedAnswer.trim();
    if (!clean || sending || !onAnswer) return;

    triggerHaptic("buzz");
    setSending(true);
    setSentAnswer(clean);
    try {
      await onAnswer(clean);
    } finally {
      setSending(false);
    }
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
          type="button"
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
              <span className={styles.buzzerText}>{buzzed ? "BUZZED IN!" : "STRIKE BUZZER"}</span>
            </>
          )}
        </button>

        {isLockedOut && (
          <div className={styles.lockoutWarning}>
            ⚠️ BUZZER LOCKED OUT BY {lockedOutBy || "ANOTHER SQUAD"}
          </div>
        )}
      </div>

      {/* Transmit Squad Answer (when active question exists) */}
      {category && onAnswer && (
        <form onSubmit={handleSendAnswer} className={styles.answerBox}>
          <div className={styles.answerHeader}>
            <span>TRANSMIT SQUAD ANSWER</span>
            {sentAnswer && <span className={styles.sentBadge}><Check size={12} /> SENT</span>}
          </div>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder="Type answer here..."
              className={styles.inputField}
              disabled={isLockedOut && !buzzed}
            />
            <button
              type="submit"
              disabled={!typedAnswer.trim() || sending}
              className={styles.sendBtn}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
