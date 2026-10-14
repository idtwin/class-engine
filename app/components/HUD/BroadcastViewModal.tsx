"use client";

import React, { useEffect } from 'react';
import { useClassroomStore } from '@/app/store/useClassroomStore';
import styles from './BroadcastViewModal.module.css';
import { Trophy, Award, Zap, CheckCircle } from 'lucide-react';
import { playSFX } from '@/app/lib/audio';

export default function BroadcastViewModal() {
  const {
    broadcastModalOpen,
    setBroadcastModalOpen,
    currentTeams,
    endSessionAndDistributeXp
  } = useClassroomStore();

  useEffect(() => {
    if (broadcastModalOpen) {
      playSFX("victory");
    }
  }, [broadcastModalOpen]);

  if (!broadcastModalOpen) return null;

  // Sort teams by score descending
  const sortedTeams = [...currentTeams].sort((a, b) => b.score - a.score);

  const handleClose = () => {
    setBroadcastModalOpen(false);
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Trophy size={28} style={{ marginRight: 8, verticalAlign: 'middle', display: 'inline' }} />
            ARENA MATCH VICTORY
          </h2>
          <div className={styles.subtitle}>OFFICIAL GAME RESULTS & XP REWARDS</div>
        </div>

        <div className={styles.podium}>
          {sortedTeams.map((team, idx) => {
            const isWinner = idx === 0;
            const xpAwarded = Math.max(10, Math.round(team.score * 0.5));
            const color = team.color || '#00FFD5';

            return (
              <div
                key={team.id}
                className={`${styles.podiumCard} ${isWinner ? styles.winnerCard : ''}`}
                style={{ '--team-color': color } as React.CSSProperties}
              >
                <div className={`${styles.rankBadge} ${isWinner ? styles.winnerBadge : styles.runnerBadge}`}>
                  {isWinner ? '👑 CHAMPIONS' : `#${idx + 1} PLACE`}
                </div>

                <div className={styles.teamName}>{team.name}</div>
                <div className={styles.teamScore}>{team.score} PTS</div>

                <div className={styles.studentList}>
                  {team.students.map((student) => (
                    <span key={student.id} className={styles.studentChip}>
                      {student.name} ({student.role || 'Member'})
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 12, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#BEEF00' }}>
                  +{xpAwarded} XP PER STUDENT
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.xpNotice}>
          <CheckCircle size={16} /> All team scores have been converted to Student XP and saved to Class Session Logs.
        </div>

        <button className={styles.closeBtn} onClick={handleClose}>
          CLOSE BROADCAST
        </button>
      </div>
    </div>
  );
}
