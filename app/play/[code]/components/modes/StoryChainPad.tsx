"use client";

import React, { useState } from "react";
import styles from "./StoryChainPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Sparkles, Check, Send } from "lucide-react";

interface StoryChainPadProps {
  starter?: string;
  currentWords?: string[];
  currentRound?: number;
  totalRounds?: number;
  onWordUsed: () => Promise<void> | void;
  onSubmitLine: (line: string) => Promise<void> | void;
}

export const StoryChainPad: React.FC<StoryChainPadProps> = ({
  starter = "Once upon a time in a tactical mission...",
  currentWords = ["brave", "mystery", "signal"],
  currentRound = 1,
  totalRounds = 5,
  onWordUsed,
  onSubmitLine,
}) => {
  const [lineInput, setLineInput] = useState("");
  const [usedFeedback, setUsedFeedback] = useState(false);

  const handleWordUsed = async () => {
    triggerHaptic("burst");
    setUsedFeedback(true);
    setTimeout(() => setUsedFeedback(false), 1200);
    await onWordUsed();
  };

  const handleSendLine = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lineInput.trim();
    if (!trimmed) return;
    triggerHaptic("tap");
    setLineInput("");
    await onSubmitLine(trimmed);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// STORY CHAIN // SQUAD WRITER</span>
        <span>ROUND {currentRound} / {totalRounds}</span>
      </div>

      {/* Story Context */}
      <div className={styles.storyCard}>
        <span className={styles.storyLabel}>STORY STARTER</span>
        <div className={styles.starterText}>&ldquo;{starter}&rdquo;</div>
      </div>

      {/* Target Vocabulary */}
      <div className={styles.wordsSection}>
        <div className={styles.wordsTitle}>TARGET WORDS TO USE:</div>
        <div className={styles.wordsList}>
          {currentWords.map((word, idx) => (
            <span key={idx} className={styles.wordChip}>
              ★ {word}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Word Used Button */}
      <button className={styles.btnWordUsed} onClick={handleWordUsed}>
        <Check size={18} />
        <span>{usedFeedback ? "+50 PTS RECORDED!" : "TARGET WORD USED! (+50)"}</span>
      </button>

      {/* Line Contribution Input */}
      <form onSubmit={handleSendLine} className={styles.inputGroup}>
        <input
          type="text"
          className={styles.inputField}
          placeholder="Suggest next sentence..."
          value={lineInput}
          onChange={(e) => setLineInput(e.target.value)}
        />
        <button type="submit" className={styles.btnAdd} disabled={!lineInput.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
