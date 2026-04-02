"use client";

import { usePathname } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import styles from "./Scoreboard.module.css";
import { useEffect, useState } from "react";

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
      {currentTeams.map(t => (
        <div key={t.id} className={styles.team}>
           <div className={styles.teamName}>{t.name}</div>
           <div className={styles.scoreRow}>
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, -10)}>-</button>
              <div className={styles.score}>{t.score}</div>
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, 10)}>+</button>
           </div>
        </div>
      ))}
    </div>
  );
}
