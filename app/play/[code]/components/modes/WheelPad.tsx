"use client";

import React, { useState } from "react";
import styles from "./WheelPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Disc3, Send, Sparkles } from "lucide-react";

interface WheelPadProps {
  onSpin: () => Promise<void> | void;
  onSolve: (guess: string) => Promise<void> | void;
}

export const WheelPad: React.FC<WheelPadProps> = ({ onSpin, onSolve }) => {
  const [guess, setGuess] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpinClick = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    triggerHaptic("burst");
    await onSpin();
    setTimeout(() => setIsSpinning(false), 2000);
  };

  const handleSolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    triggerHaptic("ping");
    await onSolve(guess.trim());
    setGuess("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// WHEEL OF FORTUNE // TACTICAL CONSOLE</span>
        <span>MULTIPLIER ARENA</span>
      </div>

      <div className={styles.spinHero}>
        <button
          onClick={handleSpinClick}
          disabled={isSpinning}
          className={styles.spinBtn}
          style={{ transform: isSpinning ? "rotate(720deg)" : "none", transition: isSpinning ? "transform 2s cubic-bezier(0.1, 0.9, 0.2, 1)" : "none" }}
        >
          <div className={styles.spinBtnInner}>
            <Disc3 size={24} color="#00ffd5" />
            <span>{isSpinning ? "SPINNING" : "TAP TO SPIN"}</span>
          </div>
        </button>

        <form className={styles.solveBox} onSubmit={handleSolveSubmit}>
          <input
            type="text"
            className={styles.solveInput}
            placeholder="Type solution guess..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
          />
          <button type="submit" className={styles.solveBtn}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
