"use client";

import { useClassroomStore } from "../store/useClassroomStore";
import { useState, useEffect } from "react";
import styles from "./teams.module.css";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Trophy, Cpu, Trash2, Users } from "lucide-react";


export default function Teams() {
  const [mounted, setMounted] = useState(false);
  const [isGeneratingState, setIsGeneratingState] = useState(false);
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
    setIsGeneratingState(true);
    generateTeams(activeClass.id, teamCount);
    setTimeout(() => {
      setIsGeneratingState(false);
    }, 400);
  };

  return (
    <div className={`${styles.container} ${isGeneratingState ? styles.generating : ''}`}>
      <div className={styles.inner}>
        {isGeneratingState && <div className={styles.lightBurst} />}
        
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <Link href="/dashboard">
              <button className={styles.iconBtn} title="Return to Dashboard">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid #00E5FF', padding: '10px', borderRadius: '8px' }}>
                  <ArrowLeft size={24} color="#00E5FF" strokeWidth={2.5} />
                </div>
              </button>
            </Link>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid #00E5FF', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={24} color="#00E5FF" strokeWidth={2.5} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
               <span className="label-caps" style={{ color: '#00E5FF', letterSpacing: '0.2em', marginBottom: '-2px' }}>Midnight Core</span>
               <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Roster: {activeClass.name}</h1>
            </div>
          </div>
          <div className={styles.controls}>
            <select 
              value={teamCount} 
              onChange={e => setTeamCount(Number(e.target.value))}
              className={styles.select}
            >
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} Teams</option>)}
            </select>
            <button 
              onClick={resetTeamsState} 
              className={styles.iconBtn} 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444', width: 'auto', padding: '0 1.25rem', gap: '0.5rem' }}
              title="Clear Match Statistics"
            >
              <Trash2 size={18} /> CLEAR MATCH STATS
            </button>
            <button onClick={handleGenerate} className={styles.generateBtn}>
              <RefreshCw size={18} className={isGeneratingState ? styles.spin : ''} /> RE-GENERATE NEURAL TEAMS
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
                    className={styles.teamTitleInput}
                  />
                  <div className={styles.scoreDisplay}>
                    <span className={styles.scoreLabel}>CUR_SCORE</span>
                    <span className={styles.score}>{team.score}</span>
                  </div>
                </div>
                
                <div className={styles.studentList}>
                  {team.students.map(student => (
                    <div key={student.id} className={styles.studentItem}>
                      <span className={styles.studentName}>{student.name}</span>
                      <select 
                        className={styles.moveSelect}
                        onChange={(e) => {
                          if (e.target.value) moveStudentToTeam(student.id, e.target.value);
                        }}
                        value=""
                      >
                        <option value="" disabled>MOVE</option>
                        {currentTeams.filter(t => t.id !== team.id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
