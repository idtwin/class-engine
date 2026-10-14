"use client";

import React from "react";
import styles from "./ControllerHeader.module.css";
import Link from "next/link";
import { triggerHaptic } from "../hooks/useHapticFeedback";

interface ControllerHeaderProps {
  gameMode: string;
  gameLabel: string;
  badgeColor: string;
  badgeBg: string;
  myTeam: { id: string; name: string; color: string; score: number } | null;
  myRank?: number;
  timerDisplay?: string;
  studentId: string;
  isConnected: boolean;
  isReconnecting: boolean;
  latencyMs: number;
  onOpenInfo?: () => void;
}

export const ControllerHeader: React.FC<ControllerHeaderProps> = ({
  gameLabel,
  badgeColor,
  badgeBg,
  myTeam,
  myRank,
  timerDisplay,
  studentId,
  isConnected,
  isReconnecting,
  latencyMs,
  onOpenInfo,
}) => {
  return (
    <header className={styles.header}>
      {/* Left: Mode Badge & Team Tag */}
      <div className={styles.leftGroup}>
        <div
          className={styles.modeBadge}
          style={{ color: badgeColor, background: badgeBg }}
        >
          <span className={styles.modeDot} style={{ background: badgeColor }} />
          {gameLabel}
        </div>

        {myTeam && (
          <div
            className={styles.teamTag}
            style={{
              borderColor: `${myTeam.color}40`,
              color: myTeam.color,
            }}
          >
            <span
              className={styles.teamColorDot}
              style={{ background: myTeam.color }}
            />
            {myTeam.name}
            {myRank !== undefined && (
              <span className={styles.rankBadge}>#{myRank}</span>
            )}
          </div>
        )}
      </div>

      {/* Right: Timer & Connection Telemetry */}
      <div className={styles.rightGroup}>
        {timerDisplay ? (
          <div className={styles.timerChip}>{timerDisplay}s</div>
        ) : null}

        {/* Tactical Connection Ping Indicator */}
        <div
          className={`${styles.pingIndicator} ${
            !isConnected || isReconnecting ? styles.pingOffline : ""
          }`}
          title={`${latencyMs}ms ping`}
        >
          <span
            className={`${styles.pingDot} ${
              !isConnected ? styles.pingDotRed : isReconnecting ? styles.pingDotYellow : ""
            }`}
          />
          <span className={styles.pingText}>
            {!isConnected
              ? "DISC"
              : isReconnecting
              ? "RECON"
              : `${latencyMs}ms`}
          </span>
        </div>

        {/* Profile Link */}
        {studentId && (
          <Link
            href={`/profile/${studentId}`}
            className={styles.profileBtn}
            onClick={() => triggerHaptic("tap")}
          >
            ID
          </Link>
        )}

        {onOpenInfo && (
          <button
            onClick={() => {
              triggerHaptic("tap");
              onOpenInfo();
            }}
            className={styles.infoBtn}
          >
            INFO
          </button>
        )}
      </div>
    </header>
  );
};
