"use client";

import React, { useState } from "react";
import styles from "./WyrPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";

interface WyrPadProps {
  optionA: string;
  optionB: string;
  votedOption?: "A" | "B" | null;
  votesA?: number;
  votesB?: number;
  onVote: (choice: "A" | "B") => Promise<void> | void;
}

export const WyrPad: React.FC<WyrPadProps> = ({
  optionA,
  optionB,
  votedOption = null,
  votesA = 0,
  votesB = 0,
  onVote,
}) => {
  const [selected, setSelected] = useState<"A" | "B" | null>(votedOption);

  const handleChoice = async (choice: "A" | "B") => {
    if (selected) return;
    triggerHaptic("tap");
    setSelected(choice);
    await onVote(choice);
  };

  const total = votesA + votesB;
  const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;

  return (
    <div className={styles.container}>
      <div className={styles.titleTag}>// WOULD YOU RATHER // SELECT VECTOR</div>

      {/* Option A Deck */}
      <button
        onClick={() => handleChoice("A")}
        disabled={!!selected}
        className={`${styles.deckBtn} ${styles.deckA} ${
          selected === "A" ? styles.selectedDeck : ""
        }`}
      >
        <div className={styles.deckHeader}>
          <span className={styles.deckTag}>SECTOR A</span>
          {selected && <span className={styles.pctTag}>{pctA}%</span>}
        </div>
        <div className={styles.deckText}>{optionA}</div>
        {selected === "A" && <div className={styles.statusLocked}>LOCKED IN ✓</div>}
      </button>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerVs}>VS</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Option B Deck */}
      <button
        onClick={() => handleChoice("B")}
        disabled={!!selected}
        className={`${styles.deckBtn} ${styles.deckB} ${
          selected === "B" ? styles.selectedDeck : ""
        }`}
      >
        <div className={styles.deckHeader}>
          <span className={styles.deckTag}>SECTOR B</span>
          {selected && <span className={styles.pctTag}>{pctB}%</span>}
        </div>
        <div className={styles.deckText}>{optionB}</div>
        {selected === "B" && <div className={styles.statusLocked}>LOCKED IN ✓</div>}
      </button>

      {/* Telemetry Bar */}
      {selected && (
        <div className={styles.telemetryBar}>
          <div className={styles.barFillA} style={{ width: `${pctA}%` }} />
          <div className={styles.barFillB} style={{ width: `${pctB}%` }} />
        </div>
      )}
    </div>
  );
};
