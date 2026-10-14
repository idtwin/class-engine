"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import styles from "./ChainReactionPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Send, Delete, CornerDownLeft, Sparkles, Check, X, ShieldAlert, Zap } from "lucide-react";

interface ChainWordState {
  word: string;
  revealed?: boolean[];
  solved?: boolean;
  isGiven?: boolean;
}

interface ChainReactionPadProps {
  words: ChainWordState[];
  currentWordIdx: number;
  isMyTurn: boolean;
  currentTeamName: string;
  currentTeamColor: string;
  lastGuess?: { teamName: string; answer: string; correct: boolean } | null;
  onSubmitAnswer: (answer: string) => Promise<void> | void;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export const ChainReactionPad: React.FC<ChainReactionPadProps> = ({
  words,
  currentWordIdx,
  isMyTurn,
  currentTeamName,
  currentTeamColor,
  lastGuess,
  onSubmitAnswer,
}) => {
  const [typedInput, setTypedInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeWord = words?.[currentWordIdx];
  const targetWord = activeWord?.word?.toUpperCase() || "";

  // Reset typed input whenever the active word or index changes
  useEffect(() => {
    setTypedInput("");
    setFeedbackToast(null);
  }, [currentWordIdx, targetWord]);

  // Show feedback when a guess resolves
  useEffect(() => {
    if (lastGuess) {
      if (lastGuess.correct) {
        setFeedbackToast(`✓ CORRECT: "${lastGuess.answer}"`);
        triggerHaptic("burst");
      } else {
        setFeedbackToast(`✗ "${lastGuess.answer}" NOT A MATCH`);
        triggerHaptic("warning");
      }
      const t = setTimeout(() => setFeedbackToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [lastGuess]);

  // Compute blank indices vs revealed indices
  const { blankIndices, revealedChars } = useMemo(() => {
    if (!activeWord || !targetWord) return { blankIndices: [], revealedChars: {} };
    const blanks: number[] = [];
    const rev: Record<number, string> = {};
    targetWord.split("").forEach((ch, idx) => {
      if (activeWord.revealed?.[idx] || activeWord.solved || activeWord.isGiven) {
        rev[idx] = ch;
      } else {
        blanks.push(idx);
      }
    });
    return { blankIndices: blanks, revealedChars: rev };
  }, [activeWord, targetWord]);

  // Smart resolution of displayed letters based on typedInput
  const displayedLetters = useMemo(() => {
    if (!targetWord) return [];
    const cleanInput = typedInput.toUpperCase().replace(/[^A-Z]/g, "");
    const chars = targetWord.split("");

    // Case 1: The user typed the whole word or typed from position 0
    if (cleanInput.length === targetWord.length || cleanInput.startsWith(targetWord[0])) {
      return chars.map((ch, idx) => {
        if (revealedChars[idx]) return revealedChars[idx];
        return cleanInput[idx] || "";
      });
    }

    // Case 2: The user typed just the missing letters for the blank slots
    let blankPointer = 0;
    return chars.map((ch, idx) => {
      if (revealedChars[idx]) return revealedChars[idx];
      const letter = cleanInput[blankPointer] || "";
      blankPointer++;
      return letter;
    });
  }, [targetWord, typedInput, revealedChars]);

  // Calculate assembled word for submission
  const assembledWord = useMemo(() => {
    if (!targetWord) return "";
    const cleanInput = typedInput.toUpperCase().replace(/[^A-Z]/g, "");

    // If cleanInput is already full length, prefer it directly
    if (cleanInput.length === targetWord.length) {
      return cleanInput;
    }

    // Otherwise combine revealed characters with displayed letters
    return displayedLetters.join("");
  }, [targetWord, typedInput, displayedLetters]);

  const handleTileClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCharClick = (char: string) => {
    triggerHaptic("tap");
    setTypedInput((prev) => {
      const next = (prev + char).toUpperCase();
      if (next.length > targetWord.length) return prev;
      return next;
    });
  };

  const handleBackspace = () => {
    triggerHaptic("tap");
    setTypedInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic("tap");
    setTypedInput("");
  };

  const handleSubmit = async () => {
    const finalGuess = assembledWord.trim().toUpperCase();
    if (!finalGuess || finalGuess.length < targetWord.length || submitting) {
      if (finalGuess.length < targetWord.length) {
        setFeedbackToast(`FILL ALL ${targetWord.length} LETTERS`);
        triggerHaptic("warning");
      }
      return;
    }

    triggerHaptic("burst");
    setSubmitting(true);
    setFeedbackToast(`BEAMING "${finalGuess}"...`);

    try {
      await onSubmitAnswer(finalGuess);
      setTypedInput("");
    } finally {
      setTimeout(() => setSubmitting(false), 800);
    }
  };

  const isComplete = assembledWord.length === targetWord.length && !assembledWord.includes(" ");

  return (
    <div className={styles.container}>
      {/* Hidden real input for native mobile keyboard */}
      <input
        ref={inputRef}
        type="text"
        value={typedInput}
        onChange={(e) => {
          const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
          if (val.length <= targetWord.length) {
            setTypedInput(val);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        className={styles.hiddenNativeInput}
        aria-label="Chain reaction typing input"
      />

      {/* Turn & Mission Status HUD */}
      <div className={styles.turnCard}>
        {isMyTurn ? (
          <div className={styles.activeTurnBadge}>
            <span className={styles.pulseDot} />
            <span>TRANSMISSION ACTIVE // YOUR SQUAD DISPATCH</span>
          </div>
        ) : (
          <div className={styles.spectatorBadge} style={{ borderColor: currentTeamColor }}>
            <span className={styles.squadBadge} style={{ background: currentTeamColor }}>
              SQUAD: {currentTeamName.toUpperCase()}
            </span>
            <span className={styles.prepareText}>PREPARE GUESS TO STEAL</span>
          </div>
        )}
      </div>

      {/* Target Word Tiles (Tap to summon mobile keyboard) */}
      <div className={styles.tileZone} onClick={handleTileClick}>
        <div className={styles.tileRow}>
          {targetWord.split("").map((_, idx) => {
            const isRevealed = Boolean(revealedChars[idx]);
            const letter = displayedLetters[idx] || "";
            const isBlank = !isRevealed;
            const isCursor = isBlank && !letter && displayedLetters.slice(0, idx).every((l, prevI) => revealedChars[prevI] || l);

            return (
              <div
                key={idx}
                className={`${styles.tile} ${
                  isRevealed
                    ? styles.tileRevealed
                    : letter
                    ? styles.tileFilled
                    : styles.tileEmpty
                } ${isCursor ? styles.tileCursor : ""}`}
              >
                {isRevealed ? revealedChars[idx] : letter}
              </div>
            );
          })}
        </div>
        <div className={styles.tapPrompt}>
          TAP TILES TO OPEN PHONE KEYBOARD OR USE TACTICAL KEYS BELOW
        </div>
      </div>

      {/* Dynamic Feedback Toast */}
      {feedbackToast && (
        <div className={styles.toastBanner}>
          <Zap size={14} className={styles.toastIcon} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Tactical Virtual Keyboard */}
      <div className={styles.keyboardContainer}>
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className={styles.keyboardRow}>
            {row.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleCharClick(char)}
                className={styles.keyBtn}
              >
                {char}
              </button>
            ))}
          </div>
        ))}

        {/* Action Bottom Row: Clear, Backspace, Submit */}
        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={handleClear}
            className={`${styles.ctrlBtn} ${styles.btnClear}`}
            title="Clear all letters"
          >
            CLEAR
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className={`${styles.ctrlBtn} ${styles.btnBack}`}
            title="Backspace"
          >
            <Delete size={18} />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            className={`${styles.ctrlBtn} ${styles.btnSubmit} ${isComplete ? styles.btnSubmitReady : ""}`}
          >
            <Send size={16} />
            <span>{submitting ? "TRANSMITTING..." : "DISPATCH"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
