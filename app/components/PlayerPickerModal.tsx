"use client";

import React, { useState } from 'react';
import { useClassroomStore, Student } from '@/app/store/useClassroomStore';
import styles from './PlayerPickerModal.module.css';
import { Dices, UserCheck, Sparkles } from 'lucide-react';
import { playSFX } from '@/app/lib/audio';

export default function PlayerPickerModal() {
  const {
    playerPickerOpen,
    setPlayerPickerOpen,
    currentTeams,
    setActiveStudentId,
    setActiveTeamIndex
  } = useClassroomStore();

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningDisplay, setSpinningDisplay] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<{ student: Student; teamName: string; teamColor: string; teamIdx: number } | null>(null);

  if (!playerPickerOpen) return null;

  // Gather all students across active teams
  const allTeamStudents: { student: Student; teamName: string; teamColor: string; teamIdx: number }[] = [];
  currentTeams.forEach((team, tIdx) => {
    team.students.forEach(student => {
      allTeamStudents.push({
        student,
        teamName: team.name,
        teamColor: team.color || '#00FFD5',
        teamIdx: tIdx
      });
    });
  });

  const handleSpin = () => {
    if (allTeamStudents.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedResult(null);
    playSFX("wheel");

    let counter = 0;
    const interval = setInterval(() => {
      const randomItem = allTeamStudents[Math.floor(Math.random() * allTeamStudents.length)];
      setSpinningDisplay(`${randomItem.student.name} (${randomItem.teamName})`);
      counter++;

      if (counter > 20) {
        clearInterval(interval);
        const finalWinner = allTeamStudents[Math.floor(Math.random() * allTeamStudents.length)];
        setSelectedResult(finalWinner);
        setIsSpinning(false);
        setActiveStudentId(finalWinner.student.id);
        setActiveTeamIndex(finalWinner.teamIdx);
        playSFX("correct");
      }
    }, 100);
  };

  return (
    <div className={styles.overlay} onClick={() => setPlayerPickerOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>
          <Dices size={24} style={{ marginRight: 8, verticalAlign: 'middle', display: 'inline' }} />
          DRAFT MYSTERY PLAYER
        </h2>

        <div className={styles.pickerDisplay}>
          {isSpinning ? (
            <div className={styles.spinningText}>{spinningDisplay}</div>
          ) : selectedResult ? (
            <>
              <div className={styles.selectedName}>{selectedResult.student.name}</div>
              {selectedResult.student.role && (
                <div className={styles.selectedRole}>ROLE: {selectedResult.student.role}</div>
              )}
              <div className={styles.selectedTeam} style={{ color: selectedResult.teamColor }}>
                SQUAD: {selectedResult.teamName}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>
              Press DRAFT to pick the next active player from your class roster!
            </div>
          )}
        </div>

        <button
          className={styles.spinBtn}
          onClick={handleSpin}
          disabled={isSpinning || allTeamStudents.length === 0}
        >
          {isSpinning ? 'SELECTING...' : selectedResult ? 'RE-DRAFT PLAYER' : 'DRAFT PLAYER'}
        </button>

        <button className={styles.closeBtn} onClick={() => setPlayerPickerOpen(false)}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
