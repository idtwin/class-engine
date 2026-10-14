"use client";

import React, { useState } from "react";
import styles from "./PictureRevealPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";

interface PictureRevealPadProps {
  tilesRevealed: number;
  totalTiles?: number;
  openClue?: string;
  guessesUsed: number;
  maxGuesses?: number;
  onDispatchGuess: (guess: string) => Promise<void> | void;
}

export const PictureRevealPad: React.FC<PictureRevealPadProps> = ({
  tilesRevealed,
  totalTiles = 25,
  openClue,
  guessesUsed,
  maxGuesses = 3,
  onDispatchGuess,
}) => {
  const [guess, setGuess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || guessesUsed >= maxGuesses || isSubmitting) return;

    triggerHaptic("buzz");
    setIsSubmitting(true);
    await onDispatchGuess(guess.trim());
    setGuess("");
    setIsSubmitting(false);
  };

  const remaining = Math.max(0, maxGuesses - guessesUsed);

  return (
    <div className={styles.container}>
      <div className={styles.telemetryCard}>
        <div className={styles.telemetryRow}>
          <span className={styles.telemetryLabel}>REVEAL COEFFICIENT</span>
          <span className={styles.telemetryVal}>
            {tilesRevealed} / {totalTiles} TILES
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(tilesRevealed / totalTiles) * 100}%` }}
          />
        </div>
      </div>

      {openClue && (
        <div className={styles.dossierBox}>
          <div className={styles.dossierTag}>SECRET FREQUENCY CLUE</div>
          <div className={styles.dossierText}>{openClue}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.guessForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={
              remaining > 0
                ? "Enter your secret guess..."
                : "TRANSMISSIONS EXHAUSTED"
            }
            disabled={remaining === 0 || isSubmitting}
            className={styles.textInput}
          />
          <button
            type="submit"
            disabled={!guess.trim() || remaining === 0 || isSubmitting}
            className={styles.dispatchBtn}
          >
            BEAM GUESS 🚀
          </button>
        </div>

        <div className={styles.guessCounter}>
          <span>DISPATCH ATTEMPTS REMAINING:</span>
          <strong style={{ color: remaining > 0 ? "#00ffd5" : "#ff4d6d" }}>
            {remaining} / {maxGuesses}
          </strong>
        </div>
      </form>
    </div>
  );
};
