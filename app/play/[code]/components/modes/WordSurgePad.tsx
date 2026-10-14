"use client";

import React, { useState, useEffect } from "react";
import styles from "./WordSurgePad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Zap, RotateCcw, Check } from "lucide-react";

interface WordSurgePadProps {
  scrambledWords?: string[];
  hint?: string;
  currentIndex?: number;
  totalPrompts?: number;
  onSubmitAnswer: (constructedSentence: string) => Promise<void> | void;
}

export const WordSurgePad: React.FC<WordSurgePadProps> = ({
  scrambledWords = [],
  hint = "Assemble the scrambled sentence in correct order",
  currentIndex = 1,
  totalPrompts = 1,
  onSubmitAnswer,
}) => {
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);

  const wordsKey = (scrambledWords || []).join("::");

  // Sync available words only when the actual scrambled words change
  useEffect(() => {
    setAvailableWords([...(scrambledWords || [])]);
    setAssembledWords([]);
    setSubmittedFeedback(null);
  }, [wordsKey]);

  const handleSelectWord = (word: string, index: number) => {
    triggerHaptic("tap");
    setAssembledWords((prev) => [...prev, word]);
    setAvailableWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeselectWord = (word: string, index: number) => {
    triggerHaptic("tap");
    setAvailableWords((prev) => [...prev, word]);
    setAssembledWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    triggerHaptic("tap");
    setAvailableWords([...scrambledWords]);
    setAssembledWords([]);
  };

  const handleSubmit = async () => {
    if (assembledWords.length === 0 || isSubmitting) return;
    triggerHaptic("burst");
    setIsSubmitting(true);
    const sentence = assembledWords.join(" ");
    setSubmittedFeedback(`SURGE DISPATCHED: "${sentence}"`);

    try {
      await onSubmitAnswer(sentence);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// WORD SURGE // CONSOLE</span>
        <span>ROUND {currentIndex} / {totalPrompts}</span>
      </div>

      {/* Tactical Hint Card */}
      <div className={styles.hintCard}>
        <span className={styles.hintLabel}>TARGET HINT // CLUE</span>
        <div className={styles.hintText}>{hint}</div>
      </div>

      {/* Assembly Zone */}
      <div className={styles.assemblyZone}>
        {assembledWords.length === 0 ? (
          <div className={styles.assemblyPlaceholder}>
            TAP SCRAMBLED CHIPS BELOW TO ASSEMBLE SENTENCE
          </div>
        ) : (
          assembledWords.map((word, idx) => (
            <button
              key={`assembled-${idx}`}
              className={`${styles.wordChip} ${styles.wordChipSelected}`}
              onClick={() => handleDeselectWord(word, idx)}
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Pool of Scrambled Words */}
      <div className={styles.poolLabel}>AVAILABLE WORDS:</div>
      <div className={styles.wordPool}>
        {availableWords.map((word, idx) => (
          <button
            key={`pool-${idx}`}
            className={styles.wordChip}
            onClick={() => handleSelectWord(word, idx)}
          >
            {word}
          </button>
        ))}
      </div>

      {submittedFeedback && (
        <div className={styles.feedbackBanner}>
          <Check size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          {submittedFeedback}
        </div>
      )}

      {/* Tactical Buttons */}
      <div className={styles.actionsRow}>
        <button
          className={styles.btnClear}
          onClick={handleClear}
          disabled={assembledWords.length === 0}
        >
          <RotateCcw size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          RESET
        </button>

        <button
          className={styles.btnSubmit}
          onClick={handleSubmit}
          disabled={assembledWords.length === 0 || isSubmitting}
        >
          <Zap size={14} />
          <span>{isSubmitting ? "SENDING..." : "SUBMIT SURGE"}</span>
        </button>
      </div>
    </div>
  );
};
