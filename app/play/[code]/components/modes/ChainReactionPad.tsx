"use client";

import React, { useState } from "react";
import styles from "./ChainReactionPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";

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
  onSubmitAnswer: (answer: string) => Promise<void> | void;
}

export const ChainReactionPad: React.FC<ChainReactionPadProps> = ({
  words,
  currentWordIdx,
  isMyTurn,
  currentTeamName,
  currentTeamColor,
  onSubmitAnswer,
}) => {
  const [typedInput, setTypedInput] = useState("");
  const activeWord = words[currentWordIdx];

  // Blank slots in the active word
  const blankIndices: number[] = activeWord
    ? activeWord.word.split("").reduce((acc: number[], _: string, i: number) => {
        if (!activeWord.revealed?.[i]) acc.push(i);
        return acc;
      }, [])
    : [];

  const handleCharClick = (char: string) => {
    if (!isMyTurn || typedInput.length >= blankIndices.length) return;
    triggerHaptic("tap");
    setTypedInput((prev) => prev + char);
  };

  const handleBackspace = () => {
    triggerHaptic("tap");
    setTypedInput((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!isMyTurn || !activeWord) return;
    // Assemble full word
    const assembled = activeWord.word
      .split("")
      .map((ch, i) => {
        const bIdx = blankIndices.indexOf(i);
        return activeWord.revealed?.[i]
          ? ch
          : bIdx >= 0 && bIdx < typedInput.length
          ? typedInput[bIdx]
          : "";
      })
      .join("");

    if (assembled.length === activeWord.word.length) {
      triggerHaptic("buzz");
      await onSubmitAnswer(assembled.toUpperCase());
      setTypedInput("");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.turnBanner}>
        {isMyTurn ? (
          <span className={styles.turnActive}>YOUR SQUAD'S TURN // TRANSMIT ANSWER</span>
        ) : (
          <span
            className={styles.turnWaiting}
            style={{ color: currentTeamColor }}
          >
            ACTIVE SQUAD: {currentTeamName.toUpperCase()}
          </span>
        )}
      </div>

      {/* Word Slots */}
      <div className={styles.slotRow}>
        {activeWord?.word.split("").map((ch, i) => {
          const isLocked = activeWord.revealed?.[i] || activeWord.solved || activeWord.isGiven;
          const bIdx = blankIndices.indexOf(i);
          const typedChar = bIdx >= 0 && bIdx < typedInput.length ? typedInput[bIdx] : "";
          const isCursor = bIdx === typedInput.length && isMyTurn;

          return (
            <div
              key={i}
              className={`${styles.tile} ${
                isLocked ? styles.tileLocked : typedChar ? styles.tileTyped : ""
              } ${isCursor ? styles.tileCursor : ""}`}
            >
              {isLocked ? ch : typedChar}
            </div>
          );
        })}
      </div>

      {/* Virtual Tactile Keyboard for Quick Thumb Typing */}
      {isMyTurn && (
        <div className={styles.keyboardSection}>
          <div className={styles.actionsBar}>
            <button onClick={handleBackspace} className={styles.actionBtn}>
              DELETE
            </button>
            <button
              onClick={handleSubmit}
              disabled={typedInput.length < blankIndices.length}
              className={`${styles.actionBtn} ${styles.submitBtn}`}
            >
              DISPATCH
            </button>
          </div>

          <div className={styles.keysGrid}>
            {"QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((k) => (
              <button
                key={k}
                onClick={() => handleCharClick(k)}
                className={styles.keyBtn}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
