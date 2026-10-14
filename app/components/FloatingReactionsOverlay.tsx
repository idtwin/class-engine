"use client";

import React, { useEffect, useState } from "react";
import styles from "./FloatingReactionsOverlay.module.css";
import { AudienceReaction } from "@/app/lib/useLiveRoomHost";

const REACTION_EMOJIS: Record<string, string> = {
  cheer: "🔥",
  clap: "👏",
  boost: "⚡",
  pass: "🛡️",
};

interface Props {
  reactions?: AudienceReaction[];
}

export default function FloatingReactionsOverlay({ reactions = [] }: Props) {
  const [activeItems, setActiveItems] = useState<AudienceReaction[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!reactions || reactions.length === 0) return;

    const newItems = reactions.filter((r) => r.id && !seenIds.has(r.id));
    if (newItems.length > 0) {
      newItems.forEach((item) => {
        setSeenIds((prev) => new Set([...prev, item.id]));
        setActiveItems((prev) => [...prev.slice(-5), item]);

        setTimeout(() => {
          setActiveItems((prev) => prev.filter((i) => i.id !== item.id));
        }, 2500);
      });
    }
  }, [reactions, seenIds]);

  if (activeItems.length === 0) return null;

  return (
    <div className={styles.overlay}>
      {activeItems.map((item) => (
        <div key={item.id} className={styles.reactionItem}>
          <span className={styles.reactionEmoji}>
            {REACTION_EMOJIS[item.reaction] || "✨"}
          </span>
          <span className={styles.reactionName}>
            {item.studentName || "OPERATOR"}
          </span>
          <span className={styles.reactionLabel}>
            {item.reaction.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
