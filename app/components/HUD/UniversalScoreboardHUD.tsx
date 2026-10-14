"use client";

import React, { useState, useEffect } from 'react';
import { useClassroomStore } from '@/app/store/useClassroomStore';
import { usePathname } from 'next/navigation';
import styles from './UniversalScoreboardHUD.module.css';
import { Trophy, Dices, Zap, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const HIDDEN_PATHS = ['/login', '/setup', '/mockup'];
const ADMIN_PATHS = ['/teams', '/games', '/dashboard', '/activities', '/prompts', '/profile'];

export default function UniversalScoreboardHUD() {
  const pathname = usePathname();
  const {
    currentTeams,
    activeTeamIndex,
    setActiveTeamIndex,
    updateTeamScore,
    teamStreaks,
    setBroadcastModalOpen,
    setPlayerPickerOpen,
    nextTurn,
    activeRoomCode
  } = useClassroomStore();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p));
  });

  const [floatingPoints, setFloatingPoints] = useState<{ id: number; teamId: string; amount: number }[]>([]);

  // Update collapse default when navigating between game and admin pages
  useEffect(() => {
    const isAdmin = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p));
    setIsCollapsed(isAdmin);
  }, [pathname]);

  if (HIDDEN_PATHS.some(path => pathname.startsWith(path))) return null;
  if (!currentTeams || currentTeams.length === 0) return null;

  const handleScoreAdjust = (teamId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTeamScore(teamId, delta);
    if (delta !== 0) {
      const id = Date.now() + Math.random();
      setFloatingPoints(prev => [...prev, { id, teamId, amount: delta }]);
      setTimeout(() => {
        setFloatingPoints(prev => prev.filter(p => p.id !== id));
      }, 1000);
    }
    if (activeRoomCode) {
      const updated = currentTeams.map(t => t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t);
      fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "sync_scores", payload: { teams: updated } })
      }).catch(console.error);
    }
  };

  // Collapsed Pill View
  if (isCollapsed) {
    return (
      <div 
        className={styles.collapsedPill}
        onClick={() => setIsCollapsed(false)}
        title="Click to expand Scoreboard HUD"
      >
        <div className={styles.pillHeader}>
          <Trophy size={14} className={styles.pillIcon} />
          <span className={styles.pillTitle}>SCOREBOARD</span>
        </div>

        <div className={styles.pillScores}>
          {currentTeams.map((t) => (
            <span key={t.id} className={styles.pillTeamScore} style={{ color: t.color || '#00FFD5' }}>
              {t.name.replace('SQUAD ', '')}: {t.score}
            </span>
          ))}
        </div>

        <button className={styles.pillExpandBtn} aria-label="Expand Scoreboard">
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  // Expanded View
  return (
    <div className={styles.scoreboardContainer}>
      <button 
        className={styles.collapseHandleBtn}
        title="Minimize Scoreboard HUD"
        onClick={() => setIsCollapsed(true)}
      >
        <ChevronDown size={14} />
      </button>

      <div className={styles.teamsList}>
        {currentTeams.map((team, idx) => {
          const isActive = activeTeamIndex === idx;
          const color = team.color || '#00FFD5';
          const colorGlow = color + '4D';
          const streak = teamStreaks[team.id] || 0;

          return (
            <div
              key={team.id}
              className={`${styles.teamCard} ${isActive ? styles.activeTeamCard : ''}`}
              style={{
                '--team-color': color,
                '--team-color-glow': colorGlow
              } as React.CSSProperties}
              onClick={() => setActiveTeamIndex(idx)}
            >
              <div className={styles.teamColorIndicator} />
              
              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{team.name}</span>
                <div className={styles.teamMeta}>
                  <span>{team.students.length} P</span>
                  {streak > 1 && (
                    <span className={styles.streakBadge}>
                      <Zap size={10} /> {streak}x
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.scoreValue}>{team.score}</div>

              <div className={styles.adjusters}>
                <button
                  className={styles.adjBtn}
                  title="Add 10 points"
                  onClick={(e) => handleScoreAdjust(team.id, 10, e)}
                >
                  +
                </button>
                <button
                  className={styles.adjBtn}
                  title="Subtract 10 points"
                  onClick={(e) => handleScoreAdjust(team.id, -10, e)}
                >
                  -
                </button>
              </div>

              {floatingPoints
                .filter(p => p.teamId === team.id)
                .map(p => (
                  <div
                    key={p.id}
                    className={styles.floatingPoint}
                    style={{ color: p.amount > 0 ? '#00FFD5' : '#FF3131' }}
                  >
                    {p.amount > 0 ? `+${p.amount}` : p.amount}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className={styles.divider} />

      <div className={styles.actionControls}>
        <button
          className={styles.hudActionBtn}
          title="Pass turn to next team"
          onClick={() => nextTurn()}
        >
          <ChevronRight size={14} /> Turn
        </button>

        <button
          className={styles.hudActionBtn}
          title="Draft Mystery Player"
          onClick={() => setPlayerPickerOpen(true)}
        >
          <Dices size={14} /> Draft
        </button>

        <button
          className={styles.hudActionBtn}
          title="Show Results & Distribute XP"
          onClick={() => setBroadcastModalOpen(true)}
        >
          <Trophy size={14} /> Finish
        </button>
      </div>
    </div>
  );
}
