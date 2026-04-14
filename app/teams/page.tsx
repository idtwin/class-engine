"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useClassroomStore, Student, Level, Energy, Team } from "../store/useClassroomStore";
import styles from "./teams.module.css";
import { useRouter } from "next/navigation";

export default function TeamsPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0); // 0: roster, 1: builder, 2: session
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(4);

  const { 
    classes, 
    activeClassId, 
    currentTeams, 
    generateTeams, 
    updateTeamScore,
    saveSession,
    updateStudent
  } = useClassroomStore();
  
  const router = useRouter();

  // Pick first available class if none active
  const activeClass = useMemo(() => {
    if (!mounted) return null;
    return classes.find(c => c.id === activeClassId) || classes[0] || null;
  }, [classes, activeClassId, mounted]);
  
  useEffect(() => {
    if (activeClass && selectedIds.length === 0) {
      setSelectedIds(activeClass.students.map(s => s.id));
    }
  }, [activeClass]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className={styles.headerTitle} style={{ opacity: 0.5, letterSpacing: '2px', fontFamily: 'JetBrains Mono' }}>INITIALIZING_COMMAND_ARRAY...</div>
    </div>
  );

  if (!activeClass) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div>
          <h1 className={styles.headerTitle} style={{ marginBottom: '16px' }}>No Active Class</h1>
          <p style={{ color: '#4a637d', fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            We couldn't synchronize the neural link. Please return to the Dashboard or force a hard reset.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => router.push('/dashboard')}>Dashboard</button>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { localStorage.clear(); window.location.reload(); }}>Hard Reset</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Logic ---

  const filteredStudents = activeClass.students.filter(s => 
    s.name.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const rosterStats = {
    highFluency: activeClass.students.filter(s => s.level === "High").length,
    midFluency: activeClass.students.filter(s => s.level === "Mid").length,
    lowFluency: activeClass.students.filter(s => s.level === "Low").length,
    activeEnergy: activeClass.students.filter(s => s.energy === "Active").length,
    highConf: activeClass.students.filter(s => s.confidence === "High").length,
  };

  const handleCycleStat = (studentId: string, statType: 'level' | 'energy' | 'confidence', e: React.MouseEvent) => {
    e.stopPropagation();
    const levels: Level[] = ["Low", "Mid", "High"];
    const energies: Energy[] = ["Passive", "Normal", "Active"];
    
    const student = activeClass.students.find(s => s.id === studentId);
    if (!student) return;

    if (statType === 'level' || statType === 'confidence') {
      const current = student[statType] as Level;
      const nextIdx = (levels.indexOf(current) + 1) % levels.length;
      updateStudent(activeClass.id, studentId, { [statType]: levels[nextIdx] });
    } else {
      const current = student.energy;
      const nextIdx = (energies.indexOf(current) + 1) % energies.length;
      updateStudent(activeClass.id, studentId, { energy: energies[nextIdx] });
    }
  };

  const getTeamStat = (team: Team, key: 'level' | 'energy' | 'confidence') => {
    const weights: Record<string, number> = { High: 3, Mid: 2, Low: 1, Active: 3, Normal: 2, Passive: 1 };
    if (team.students.length === 0) return 0;
    const sum = team.students.reduce((acc, s) => acc + (weights[s[key] as string] || 0), 0);
    return Math.round((sum / team.students.length / 3) * 100);
  };

  const calculateGap = () => {
    if (currentTeams.length < 2) return 0;
    const sorted = [...currentTeams].sort((a,b) => b.score - a.score);
    return sorted[0].score - sorted[sorted.length -1].score;
  };

  const finishSession = () => {
    const scores: Record<string, number> = {};
    let total = 0;
    currentTeams.forEach(t => { scores[t.name] = t.score; total += t.score; });
    saveSession({
      classId: activeClass.id,
      className: activeClass.name,
      gameType: "Teams Session",
      scores,
      totalScore: total,
      accuracy: 85,
      energy: 90
    });
    router.push("/dashboard");
  };

  // --- Theme Colors ---
  const teamHex = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];
  const flColor = { Low: '#ff8080', Mid: '#ffc843', High: '#00e87a' };
  const enColor = { Passive: '#4a637d', Normal: '#00c8f0', Active: '#ff7d3b' };
  const coColor = { Low: '#ff8080', Mid: '#ffc843', High: '#b06eff' };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>PROJECT S.E.R.U // <span>{activeClass.name}</span></div>
          <h1 className={styles.headerTitle}>Teams & Roster</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.tag + ' ' + styles.tagCyan}>{activeClass.students.length} Students</span>
          <button className={`${styles.btn} ${styles.btnGhost}`}>⚙ Settings</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push("/dashboard")}>⇄ Switch Node</button>
        </div>
      </div>

      {/* STEPPER */}
      <div className={styles.stepper}>
        <div className={`${styles.step} ${step === 0 ? styles.stepActive : styles.stepDone}`} onClick={() => setStep(0)}>
          <div className={styles.stepNum}>{step > 0 ? "✓" : "1"}</div>
          Roster Setup
        </div>
        <div className={styles.stepDivider}></div>
        <div className={`${styles.step} ${step === 1 ? styles.stepActive : step > 1 ? styles.stepDone : ""}`} onClick={() => step >= 1 && setStep(1)}>
          <div className={styles.stepNum}>{step > 1 ? "✓" : "2"}</div>
          Team Builder
        </div>
        <div className={styles.stepDivider}></div>
        <div className={`${styles.step} ${step === 2 ? styles.stepActive : ""}`} onClick={() => step >= 2 && setStep(2)}>
          <div className={styles.stepNum}>3</div>
          Live Session
        </div>
      </div>

      {/* VIEW 1: ROSTER */}
      {step === 0 && (
        <div className={styles.view}>
          <div className={styles.rosterToolbar}>
            <input 
              className={styles.rosterSearch} 
              placeholder="Search student..." 
              value={rosterSearch}
              onChange={e => setRosterSearch(e.target.value)}
            />
            <div className={styles.rosterStats}>
              <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#00e87a'}}>{rosterStats.highFluency}</div><div className={styles.rstatLabel}>High Fluency</div></div>
              <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#ffc843'}}>{rosterStats.midFluency}</div><div className={styles.rstatLabel}>Mid Fluency</div></div>
              <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#ff8080'}}>{rosterStats.lowFluency}</div><div className={styles.rstatLabel}>Low Fluency</div></div>
              <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#ff7d3b'}}>{rosterStats.activeEnergy}</div><div className={styles.rstatLabel}>Active Energy</div></div>
              <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#b06eff'}}>{rosterStats.highConf}</div><div className={styles.rstatLabel}>High Conf</div></div>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { generateTeams(activeClass.id, teamCount, selectedIds); setStep(1); }}>
              → Generate Teams
            </button>
          </div>

          <div className={styles.rosterGrid}>
            {filteredStudents.map(s => (
              <div 
                key={s.id} 
                className={`${styles.studentCard} ${selectedIds.includes(s.id) ? styles.studentCardActive : ""}`}
                onClick={() => setSelectedIds(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])}
              >
                <div className={styles.studentName}>{s.name}</div>
                <div>
                  <div className={styles.stagLabel}>English Fluency</div>
                  <span className={`${styles.stag} ${s.level === 'High' ? styles.stagHigh : s.level === 'Mid' ? styles.stagMid : styles.stagLow}`} onClick={(e) => handleCycleStat(s.id, 'level', e)}>
                    {s.level.toUpperCase()} LVL
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div>
                    <div className={styles.stagLabel}>Energy</div>
                    <span className={`${styles.stag} ${s.energy === 'Active' ? styles.stagActive : s.energy === 'Normal' ? styles.stagNorm : styles.stagPass}`} onClick={(e) => handleCycleStat(s.id, 'energy', e)}>
                      {s.energy.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className={styles.stagLabel}>Confidence</div>
                    <span className={`${styles.stag} ${s.confidence === 'High' ? styles.stagCoHigh : s.confidence === 'Mid' ? styles.stagCoMid : styles.stagCoLow}`} onClick={(e) => handleCycleStat(s.id, 'confidence', e)}>
                      {s.confidence.toUpperCase()} CONF
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: TEAM BUILDER */}
      {step === 1 && (
        <div className={styles.view}>
          <div className={styles.builderHeader}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(0)}>← Roster</button>
              <button className={`${styles.btn} ${styles.btnCyan}`} onClick={() => generateTeams(activeClass.id, teamCount, selectedIds)}>↻ Re-generate</button>
              <button className={`${styles.btn} ${styles.btnDanger}`}>✕ Clear Scores</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#4a637d' }}>Teams:</div>
                <select 
                  className={styles.rosterSearch} 
                  style={{ width: '120px', padding: '8px' }}
                  value={teamCount}
                  onChange={e => {
                    const n = parseInt(e.target.value);
                    setTeamCount(n);
                    generateTeams(activeClass.id, n, selectedIds);
                  }}
                >
                  {[2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} Teams</option>)}
                </select>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep(2)}>→ Start Session</button>
            </div>
          </div>

          <div className={styles.balanceSummary} style={{ gridTemplateColumns: `repeat(${currentTeams.length}, 1fr)` }}>
            {currentTeams.map((team, i) => {
              const fl = getTeamStat(team, 'level');
              const en = getTeamStat(team, 'energy');
              const co = getTeamStat(team, 'confidence');
              return (
                <div key={team.id} className={styles.bsCard}>
                  <div className={styles.bsTitle}>
                    <div className={styles.bsDot} style={{ background: teamHex[i % teamHex.length] }}></div>
                    <div className={styles.bsName} style={{ color: teamHex[i % teamHex.length] }}>{team.name}</div>
                    <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#4a637d' }}>{team.students.length} students</div>
                  </div>
                  {[
                    { label: 'Fluency', val: fl, col: '#ffc843' },
                    { label: 'Energy', val: en, col: '#00c8f0' },
                    { label: 'Confidence', val: co, col: '#ffc843' }
                  ].map((row, idx) => (
                    <div key={idx}>
                      <div className={styles.bsRow}><span className={styles.bsLabel}>{row.label}</span><span className={styles.bsVal} style={{ color: row.col }}>{row.val}%</span></div>
                      <div className={styles.bsTrack}><div className={styles.bsFill} style={{ width: `${row.val}%`, background: row.col }}></div></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className={styles.teamsGrid} style={{ gridTemplateColumns: `repeat(${Math.min(4, currentTeams.length)}, 1fr)` }}>
            {currentTeams.map((team, i) => (
              <div key={team.id} className={styles.teamCard} style={{ borderTop: `2px solid ${teamHex[i % teamHex.length]}` }}>
                <div className={styles.teamHeader}>
                  <div className={styles.teamNameRow}>
                    <div className={styles.teamDot} style={{ background: teamHex[i % teamHex.length], boxShadow: `0 0 6px ${teamHex[i % teamHex.length]}` }}></div>
                    <div className={styles.teamName} style={{ color: teamHex[i % teamHex.length] }}>{team.name}</div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#4a637d' }}>{team.students.length} students</div>
                </div>
                <div className={styles.teamMembers}>
                  {team.students.map(s => (
                    <div key={s.id} className={styles.memberRow}>
                      <div>
                        <div className={styles.memberName}>{s.name}</div>
                        <div className={styles.memberMiniTags} style={{ marginTop: '3px' }}>
                          <div className={styles.miniTag} style={{ background: flColor[s.level] }}></div>
                          <div className={styles.miniTag} style={{ background: enColor[s.energy] }}></div>
                          <div className={styles.miniTag} style={{ background: coColor[s.confidence] }}></div>
                        </div>
                      </div>
                      <button className={styles.moveBtn}>Move</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: LIVE SESSION */}
      {step === 2 && (
        <div className={styles.view}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>← Teams</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className={`${styles.btn} ${styles.btnGhost}`}>📽 Projector View</button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={finishSession}>✕ End Session</button>
            </div>
          </div>

          <div className={styles.sessionTop} style={{ gridTemplateColumns: `repeat(${currentTeams.length}, 1fr)` }}>
            {currentTeams.sort((a,b) => b.score - a.score).map((team, i) => {
              const rank = i + 1;
              const originalIdx = currentTeams.findIndex(t => t.id === team.id);
              return (
                <div key={team.id} className={styles.scoreCard} style={{ borderTop: `2px solid ${teamHex[originalIdx % teamHex.length]}` }}>
                  <div className={styles.scoreCardGlow} style={{ background: teamHex[originalIdx % teamHex.length] }}></div>
                  <div className={styles.scoreCardHeader}>
                    <div className={styles.scoreTeamLabel} style={{ color: teamHex[originalIdx % teamHex.length] }}>{team.name}</div>
                    <div className={`${styles.scoreRank} ${rank === 1 ? styles.scoreRankFirst : ""}`}>{rank === 1 ? '👑' : '#' + rank}</div>
                  </div>
                  <div className={styles.scoreValue} style={{ color: teamHex[originalIdx % teamHex.length] }}>{team.score.toLocaleString()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#4a637d' }}>
                      {Math.round(team.score / (currentTeams.reduce((a,b)=>a+b.score, 0) || 1) * 100)}% of total
                    </div>
                    {rank === 1 && currentTeams.length > 1 && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ffc843' }}>
                        +{(team.score - (currentTeams[1]?.score || 0)).toLocaleString()} lead
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.dominantAlert}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>
              <strong>{currentTeams.sort((a,b)=>b.score-a.score)[0]?.name}</strong> is leading by <strong>{calculateGap().toLocaleString()} pts</strong> — consider a catch-up round.
            </span>
          </div>

          <div className={styles.gapSection}>
            <div className={styles.gapLabel}>
              <span>Score Distribution</span>
              <span>Gap: {calculateGap().toLocaleString()} pts</span>
            </div>
            <div className={styles.gapTrack}>
              {currentTeams.map((team, i) => (
                <div 
                  key={team.id} 
                  className={styles.gapSeg} 
                  style={{ 
                    width: `${(team.score / (currentTeams.reduce((a,b)=>a+b.score,0) || 1)) * 100}%`,
                    background: teamHex[i % teamHex.length]
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.historySection}>
            <div className={styles.sectionTitle}>Session History</div>
            <div className={styles.historyGrid}>
              <div className={styles.historyRow}>
                <div className={styles.historyHeader}>Game</div>
                {currentTeams.map((t, i) => <div key={t.id} className={styles.historyHeader} style={{ color: teamHex[i % teamHex.length], textAlign: 'center' }}>{t.name.split(' ')[1] || t.name}</div>)}
                <div className={styles.historyHeader} style={{ textAlign: 'right' }}>Winner</div>
              </div>
              <div className={styles.historyRow} style={{ opacity: 0.5 }}>
                <div style={{ fontWeight: 700, fontSize: '12px' }}>Neural Syncing...</div>
                {currentTeams.map(t => <div key={t.id} style={{ textAlign: 'center', fontFamily: 'JetBrains Mono' }}>+0</div>)}
                <div style={{ textAlign: 'right', fontSize: '9px' }}>PENDING</div>
              </div>
            </div>
          </div>

          <div className={styles.adjustGrid} style={{ gridTemplateColumns: `repeat(${currentTeams.length}, 1fr)` }}>
            {currentTeams.map((team, i) => (
              <div key={team.id} className={styles.adjustCard}>
                <div className={styles.adjustTeamName} style={{ color: teamHex[i % teamHex.length] }}>{team.name}</div>
                <div className={styles.adjustControls}>
                  <button className={styles.adjBtn} onClick={() => updateTeamScore(team.id, -100)}>−</button>
                  <div className={styles.adjScore} style={{ color: teamHex[i % teamHex.length] }}>{team.score.toLocaleString()}</div>
                  <button className={styles.adjBtn} onClick={() => updateTeamScore(team.id, 100)}>+</button>
                </div>
                <input 
                  className={styles.rosterSearch} 
                  style={{ width: '80px', textAlign: 'center' }} 
                  placeholder="+/-"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      if (!isNaN(val)) {
                        updateTeamScore(team.id, val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
