"use client";

import { usePathname } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import styles from "./Scoreboard.module.css";
import { useEffect, useState } from "react";

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];

export default function ScoreboardOverlay() {
  const pathname = usePathname();
  const { currentTeams, updateTeamScore, setTeamScore } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const startEditing = (teamId: string, currentScore: number) => {
    setEditingTeamId(teamId);
    setEditValue(String(currentScore));
  };

  const commitEdit = (teamId: string) => {
    const newScore = parseInt(editValue, 10);
    if (!isNaN(newScore)) {
      setTeamScore(teamId, newScore);
    }
    setEditingTeamId(null);
  };

  return (
    <div className={styles.scoreboard}>
      {currentTeams.map((t, i) => {
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        const isEditing = editingTeamId === t.id;
        return (
        <div key={t.id} className={styles.team} style={{ borderTop: `3px solid ${color}` }}>
           <div className={styles.teamName} style={{ color }}>{t.name}</div>
           <div className={styles.scoreRow}>
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, -10)}>-</button>
              {isEditing ? (
                <input
                  className={styles.scoreInput}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(t.id);
                    if (e.key === "Escape") setEditingTeamId(null);
                  }}
                  autoFocus
                  style={{ color }}
                />
              ) : (
                <div
                  className={styles.score}
                  style={{ color, cursor: "pointer" }}
                  onClick={() => startEditing(t.id, t.score)}
                  title="Click to edit score"
                >
                  {t.score}
                </div>
              )}
              <button className={styles.scoreBtn} onClick={() => updateTeamScore(t.id, 10)}>+</button>
           </div>
        </div>
        );
      })}
    </div>
  );
}
