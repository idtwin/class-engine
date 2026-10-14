"use client";

import React, { useState, useEffect } from "react";
import styles from "./QuickChoicePad.module.css";
import { triggerHaptic } from "../../hooks/useHapticFeedback";

interface QuickChoiceOption {
  key: string;
  label: string;
  color?: string;
}

interface QuickChoicePadProps {
  promptText?: string;
  privateHint?: string;
  options: QuickChoiceOption[];
  onSelectOption: (key: string) => Promise<void> | void;
  disabled?: boolean;
  selectedKey?: string | null;
}

export const QuickChoicePad: React.FC<QuickChoicePadProps> = ({
  promptText,
  privateHint,
  options,
  onSelectOption,
  disabled = false,
  selectedKey = null,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(selectedKey);

  // Reset active choice whenever prompt text or selectedKey prop changes between rounds
  useEffect(() => {
    setActiveKey(selectedKey || null);
  }, [promptText, selectedKey]);

  const handleSelect = async (optKey: string) => {
    if (disabled || activeKey) return;
    triggerHaptic("tap");
    setActiveKey(optKey);
    await onSelectOption(optKey);
  };

  return (
    <div className={styles.container}>
      {/* Asymmetric Private Dossier Banner */}
      {privateHint && (
        <div className={styles.dossierBanner}>
          <div className={styles.dossierHeader}>
            <span className={styles.dossierDot} />
            <span className={styles.dossierTitle}>ENCRYPTED DOSSIER // YOUR SCREEN ONLY</span>
          </div>
          <div className={styles.dossierText}>{privateHint}</div>
        </div>
      )}

      {promptText && (
        <div className={styles.promptCard}>
          <div className={styles.promptTag}>ACTIVE MISSION</div>
          <div className={styles.promptBody}>{promptText}</div>
        </div>
      )}

      {/* Tactile Response Grid */}
      <div className={styles.grid}>
        {options.map((opt) => {
          const isSelected = activeKey === opt.key;
          return (
            <button
              key={opt.key}
              disabled={disabled || !!activeKey}
              onClick={() => handleSelect(opt.key)}
              className={`${styles.choiceBtn} ${isSelected ? styles.choiceBtnSelected : ""}`}
              style={{
                borderColor: isSelected ? opt.color || "#00ffd5" : undefined,
                boxShadow: isSelected ? `0 0 16px ${opt.color || "#00ffd5"}40` : undefined,
              }}
            >
              <span
                className={styles.keyBadge}
                style={{ background: opt.color || "#00ffd5" }}
              >
                {opt.key}
              </span>
              <span className={styles.choiceLabel}>{opt.label}</span>
              {isSelected && <span className={styles.lockedBadge}>LOCKED</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
