"use client";

import { useClassroomStore } from "../store/useClassroomStore";
import { useState, useEffect } from "react";
import styles from "./teams.module.css";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Trophy } from "lucide-react";

export default function Teams() {
  const [mounted, setMounted] = useState(false);
  const [teamCount, setTeamCount] = useState(4);
  const { currentTeams, generateTeams, resetTeamsState, activeClassId, classes, updateTeamScore, updateTeamName, moveStudentToTeam } = useClassroomStore();
  
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const activeClass = classes.find(c => c.id === activeClassId);

  if (!activeClass) {
    return (
      <div className={styles.container}>
        <h1>No Active Class</h1>
        <Link href="/dashboard"><button>Go Back</button></Link>
      </div>
    );
  }

  const handleGenerate = () => {
    generateTeams(activeClass.id, teamCount);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard">
            <button className={styles.iconBtn}><ArrowLeft /></button>
          </Link>
          <h1>Teams: {activeClass.name}</h1>
        </div>
        <div className={styles.controls}>
          <select 
            value={teamCount} 
            onChange={e => setTeamCount(Number(e.target.value))}
            className={styles.select}
          >
            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} Teams</option>)}
          </select>
          <button onClick={resetTeamsState} className={styles.iconBtn} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444' }}>
            Clear Match Stats
          </button>
          <button onClick={handleGenerate} className={styles.generateBtn}>
            <RefreshCw size={20} /> Generate Balanced Teams
          </button>
        </div>
      </header>

      {currentTeams.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Click Generate to create balanced teams.</p>
        </div>
      ) : (
        <div className={styles.teamsGrid}>
          {currentTeams.map(team => (
            <div key={team.id} className={styles.teamCard}>
              <div className={styles.teamHeader}>
                <input 
                  value={team.name}
                  onChange={e => updateTeamName(team.id, e.target.value)}
                  style={{ background: 'transparent', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', border: '1px dashed transparent', width: '60%', padding: '0.2rem' }}
                />
                <div className={styles.scoreControl}>
                  <button onClick={() => updateTeamScore(team.id, -1)}>-</button>
                  <span className={styles.score}>{team.score}</span>
                  <button onClick={() => updateTeamScore(team.id, 1)}>+</button>
                </div>
              </div>
              
              <ul className={styles.studentList}>
                {team.students.map(student => (
                  <li key={student.id} className={styles.studentItem}>
                    <span>{student.name}</span>
                    <select 
                      className={styles.moveSelect}
                      onChange={(e) => {
                        if (e.target.value) moveStudentToTeam(student.id, e.target.value);
                      }}
                      value=""
                    >
                      <option value="" disabled>Move...</option>
                      {currentTeams.filter(t => t.id !== team.id).map(t => (
                        <option key={t.id} value={t.id}>To {t.name}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
