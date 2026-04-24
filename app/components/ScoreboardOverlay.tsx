"use client";

import { usePathname } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import styles from "./Scoreboard.module.css";
import { useEffect, useState, useRef } from "react";
import { Shield, Zap, Triangle, Asterisk, Diamond, Hexagon, Star, Flame } from "lucide-react";

// Team color palette perfectly matching screenshot + a few extras for larger sizes
const TEAM_COLORS = [
  "#00FF41", // Green  - Alpha
  "#00E5FF", // Cyan   - Bravo
  "#FFB800", // Amber  - Charlie
  "#FF2D78", // Pink   - Delta
  "#BC13FE", // Purple - Epsilon
  "#FF9100", // Orange - Zeta
  "#2DD4BF", // Teal   - Eta
  "#F87171", // Red    - Theta
];

const TEAM_ICONS = [
  Shield, Zap, Triangle, Asterisk, Diamond, Hexagon, Star, Flame
];

const formatScore = (n: number) => n.toLocaleString();
const HIDDEN_PATHS = new Set(["/", "/dashboard", "/teams", "/games", "/join", "/play"]);

export default function ScoreboardOverlay() {
  const pathname = usePathname();
  const { currentTeams, updateTeamScore, setTeamScore, activeAwardAmount, activeClassId, awardStudentXp } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [flashingTeamId, setFlashingTeamId] = useState<string | null>(null);
  const prevScores = useRef<Record<string, number>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    currentTeams.forEach(t => {
      if (prevScores.current[t.id] !== undefined && prevScores.current[t.id] !== t.score) {
        setFlashingTeamId(t.id);
        setTimeout(() => setFlashingTeamId(null), 400);
      }
      prevScores.current[t.id] = t.score;
    });
  }, [currentTeams]);

  if (!mounted) return null;
  if (HIDDEN_PATHS.has(pathname)) return null;
  if (currentTeams.length === 0) return null;

  const startEditing = (teamId: string, currentScore: number) => {
    setEditingTeamId(teamId);
    setEditValue(String(currentScore));
  };

  const commitEdit = (teamId: string) => {
    const newScore = parseInt(editValue, 10);
    if (!isNaN(newScore)) setTeamScore(teamId, newScore);
    setEditingTeamId(null);
  };

  return (
    <div className={styles.scoreboard}>
      {currentTeams.map((t, i) => {
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        const Icon = TEAM_ICONS[i % TEAM_ICONS.length];
        const isEditing = editingTeamId === t.id;
        const isFlashing = flashingTeamId === t.id;

        return (
          <div key={t.id} className={styles.teamTile}>
            {/* The single thick horizontal accent bar at the absolute top of the tile */}
            <div className={styles.topAccent} style={{ backgroundColor: color }} />
            
            <div className={styles.iconWrapper} style={{ color }}>
              <Icon size={24} strokeWidth={2.5} />
            </div>

            <div className={styles.scoreRow}>
              {isEditing ? (
                <input
                  className={styles.scoreInput}
                  type="number"
                  value={editValue}
                  style={{ color }}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(t.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit(t.id);
                    if (e.key === "Escape") setEditingTeamId(null);
                  }}
                  autoFocus
                />
              ) : (
                <div
                  className={`${styles.score} ${isFlashing ? styles.scoreFlash : ""}`}
                  style={{ color }}
                  onClick={() => startEditing(t.id, t.score)}
                >
                  {formatScore(t.score)}
                </div>
              )}
            </div>

            <span className={styles.teamName} style={{ color: "rgba(255,255,255,0.4)" }}>
              {t.name}
            </span>

            {/* Hidden admin adjust buttons on hover (or top) -- we'll keep them subtle */}
            <div className={styles.adjustLayer}>
              <button className={styles.adjustBtn} onClick={() => {
                updateTeamScore(t.id, activeAwardAmount);
                // Award 20 XP per student on the team for a positive manual award
                if (activeAwardAmount > 0 && activeClassId) {
                  t.students.forEach(s => awardStudentXp(activeClassId, s.id, 20, 'manual_award'));
                }
              }}>+</button>
              <button className={styles.adjustBtn} onClick={() => updateTeamScore(t.id, -activeAwardAmount)}>−</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
