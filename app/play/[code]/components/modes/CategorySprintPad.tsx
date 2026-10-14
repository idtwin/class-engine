"use client";
import React, { useState, useEffect } from "react";
import styles from "./CategorySprintPad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";
import { Send, Bell, Zap } from "lucide-react";

interface CategorySprintPadProps {
  category?: string;
  count?: number;
  difficulty?: string;
  onSendWord: (word: string) => Promise<void> | void;
  onBuzz: () => Promise<void> | void;
}

export const CategorySprintPad: React.FC<CategorySprintPadProps> = ({
  category = "CATEGORY SPRINT",
  count = 3,
  difficulty = "Medium",
  onSendWord,
  onBuzz,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [recentEntries, setRecentEntries] = useState<string[]>([]);
  const [buzzed, setBuzzed] = useState(false);

  // Clear previous category entries when target category changes
  useEffect(() => {
    setRecentEntries([]);
    setInputVal("");
  }, [category]);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    triggerHaptic("burst");
    setRecentEntries((prev) => [trimmed, ...prev.slice(0, 5)]);
    setInputVal("");
    await onSendWord(trimmed);
  };

  const handleBuzz = async () => {
    triggerHaptic("burst");
    setBuzzed(true);
    setTimeout(() => setBuzzed(false), 1500);
    await onBuzz();
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTag}>
        <span>// CATEGORY SPRINT // SQUAD RADAR</span>
        <span>{difficulty.toUpperCase()}</span>
      </div>

      {/* Category Target Card */}
      <div className={styles.categoryCard}>
        <span className={styles.categoryLabel}>TARGET CATEGORY</span>
        <div className={styles.categoryTitle}>{category}</div>
        <div className={styles.targetBadge}>NAME {count} REQUIRED</div>
      </div>

      {/* Fast Input Field */}
      <form onSubmit={handleAdd} className={styles.inputGroup}>
        <input
          type="text"
          className={styles.inputField}
          placeholder="Type an item..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          autoCapitalize="none"
        />
        <button type="submit" className={styles.btnAdd} disabled={!inputVal.trim()}>
          <Send size={14} />
        </button>
      </form>

      {/* Recent submissions list */}
      {recentEntries.length > 0 && (
        <div className={styles.recentList}>
          {recentEntries.map((item, idx) => (
            <span key={idx} className={styles.recentItem}>
              ✓ {item}
            </span>
          ))}
        </div>
      )}

      {/* Tactile Buzzer */}
      <div className={styles.buzzerSection}>
        <button
          className={styles.btnBuzz}
          onClick={handleBuzz}
          style={buzzed ? { background: "#00e87a", borderColor: "#69f0ae" } : {}}
        >
          <Bell size={20} />
          <span>{buzzed ? "BUZZED!" : "BUZZ IN"}</span>
        </button>
      </div>
    </div>
  );
};
