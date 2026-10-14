"use client";

import React, { useState } from "react";
import styles from "./ReactionDrawer.module.css";
import { triggerHaptic } from "../hooks/useHapticFeedback";

interface ReactionDrawerProps {
  onSendReaction: (reaction: "cheer" | "clap" | "boost" | "pass") => void;
}

const REACTIONS: Array<{
  id: "cheer" | "clap" | "boost" | "pass";
  emoji: string;
  label: string;
}> = [
  { id: "cheer", emoji: "🔥", label: "HYPE" },
  { id: "clap", emoji: "👏", label: "APPLAUD" },
  { id: "boost", emoji: "⚡", label: "BOOST" },
  { id: "pass", emoji: "🛡️", label: "RALLY" },
];

function playSynthesizedTone(type: "cheer" | "clap" | "boost" | "pass") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "cheer") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "boost") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "clap") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    }
  } catch (e) {}
}

export const ReactionDrawer: React.FC<ReactionDrawerProps> = ({ onSendReaction }) => {
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Array<{ id: number; emoji: string; x: number }>>([]);

  const handleEmit = (id: "cheer" | "clap" | "boost" | "pass", emoji: string, index: number) => {
    triggerHaptic("burst");
    playSynthesizedTone(id);
    setLastClicked(id);

    // Spawn floating bubble over the clicked button
    const bubbleId = Date.now() + Math.random();
    const xPos = index * 25 + 12.5; // percentage across the bar
    setBubbles((prev) => [...prev.slice(-6), { id: bubbleId, emoji, x: xPos }]);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 800);

    onSendReaction(id);
    setTimeout(() => setLastClicked(null), 250);
  };

  return (
    <div className={styles.container}>
      {/* Floating Animated Emojis */}
      {bubbles.map((b) => (
        <span
          key={b.id}
          className={styles.floatingBubble}
          style={{ left: `${b.x}%`, bottom: "40px" }}
        >
          {b.emoji}
        </span>
      ))}

      <div className={styles.bar}>
        {REACTIONS.map((r, idx) => (
          <button
            key={r.id}
            onClick={() => handleEmit(r.id, r.emoji, idx)}
            className={`${styles.reactionBtn} ${
              lastClicked === r.id ? styles.reactionBtnActive : ""
            }`}
          >
            <span className={styles.emoji}>{r.emoji}</span>
            <span className={styles.label}>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
