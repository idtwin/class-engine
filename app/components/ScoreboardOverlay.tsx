"use client";

import { usePathname } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import styles from "./Scoreboard.module.css";
import { useEffect, useState } from "react";

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];

export default function ScoreboardOverlay() {
  const pathname = usePathname();
  const { currentTeams, updateTeamScore } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Do not show the scoreboard on the Dashboard, Teams editor, Games hub, or root URL
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/teams" || pathname === "/games" || pathname === "/join") {
    return null;
  }

  // Do not show if no teams exist
  if (currentTeams.length === 0) return null;

  return (
    <div className={styles.scoreboard}>
      {currentTeams.map((t, i) => {
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        return (
        <div key={t.id} className={styles.team} style={{ borderTop: `3px solid ${color}` }}>
           <div className={styles.teamName} style={{ color }}>{t.name}</div>
           <div className={styles.scoreRow}>
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, -10)}>-</button>
              <div className={styles.score} style={{ color }}>{t.score}</div>
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, 10)}>+</button>
           </div>
        </div>
        );
      })}
    </div>
  );
}

