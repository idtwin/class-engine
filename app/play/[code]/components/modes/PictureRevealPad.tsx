"use client";

import React, { useState, useEffect } from "react";
import styles from "./PictureRevealPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Bell, Sparkles, Send, Check } from "lucide-react";

interface PictureRevealPadProps {
  tilesRevealed: number;
  totalTiles?: number;
  openClue?: string;
  guessesUsed: number;
  maxGuesses?: number;
  activeTile?: {
    text?: string;
    tileIndex?: number;
    options?: Record<string, string>;
  } | null;
  onDispatchGuess: (guess: string) => Promise<void> | void;
  onAnswerTile?: (choice: string) => Promise<void> | void;
  onBuzzTile?: () => Promise<void> | void;
}

export const PictureRevealPad: React.FC<PictureRevealPadProps> = ({
  tilesRevealed,
  totalTiles = 16,
  openClue,
  guessesUsed,
  maxGuesses = 3,
  activeTile = null,
  onDispatchGuess,
  onAnswerTile,
  onBuzzTile,
}) => {
  const [guess, setGuess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [buzzed, setBuzzed] = useState(false);

  // Reset tile question local state when tile changes
  useEffect(() => {
    setSelectedOption(null);
    setBuzzed(false);
  }, [activeTile?.text, activeTile?.tileIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || guessesUsed >= maxGuesses || isSubmitting) return;

    triggerHaptic("buzz");
    setIsSubmitting(true);
    await onDispatchGuess(guess.trim());
    setGuess("");
    setIsSubmitting(false);
  };

  const handleTileOption = async (key: string) => {
    if (selectedOption || !onAnswerTile) return;
    triggerHaptic("tap");
    setSelectedOption(key);
    await onAnswerTile(key);
  };

  const handleBuzz = async () => {
    if (!onBuzzTile || buzzed) return;
    triggerHaptic("burst");
    setBuzzed(true);
    await onBuzzTile();
    setTimeout(() => setBuzzed(false), 2000);
  };

  const remaining = Math.max(0, maxGuesses - guessesUsed);

  return (
    <div className={styles.container}>
      {/* Board Telemetry Header */}
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

      {/* Active Tile Question Card (when teacher clicks a tile) */}
      {activeTile?.text && (
        <div className={styles.activeTileCard}>
          <div className={styles.activeTileHeader}>
            <span>TILE #{(activeTile.tileIndex ?? 0) + 1} // ACTIVE QUERY</span>
            {onBuzzTile && (
              <button
                type="button"
                onClick={handleBuzz}
                className={styles.tileBuzzBtn}
                style={buzzed ? { background: "#00e87a", color: "#060810" } : {}}
              >
                <Bell size={12} />
                <span>{buzzed ? "BUZZED!" : "BUZZ"}</span>
              </button>
            )}
          </div>
          <div className={styles.tileQuestionText}>{activeTile.text}</div>

          {/* Multiple choice options if present */}
          {activeTile.options && (
            <div className={styles.optionsGrid}>
              {Object.entries(activeTile.options).map(([key, label]) => {
                const isSelected = selectedOption === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={Boolean(selectedOption)}
                    onClick={() => handleTileOption(key)}
                    className={`${styles.tileOptionBtn} ${
                      isSelected ? styles.tileOptionSelected : ""
                    }`}
                  >
                    <span className={styles.optionKey}>{key}</span>
                    <span className={styles.optionLabel}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {openClue && (
        <div className={styles.dossierBox}>
          <div className={styles.dossierTag}>TACTICAL SENSOR CLUE</div>
          <div className={styles.dossierText}>{openClue}</div>
        </div>
      )}

      {/* Overall Image Guess Submission Form */}
      <form onSubmit={handleSubmit} className={styles.guessForm}>
        <div className={styles.guessHeader}>
          <span>OVERALL IMAGE TRANSMISSION</span>
          <span style={{ color: remaining > 0 ? "#00ffd5" : "#ff4d6d" }}>
            {remaining} / {maxGuesses} ATTEMPTS
          </span>
        </div>

        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={
              remaining > 0
                ? "Guess entire secret image..."
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
            BEAM 🚀
          </button>
        </div>
      </form>
    </div>
  );
};
