"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useClassroomStore, Student, Level, Energy, Team } from "../store/useClassroomStore";
import styles from "./teams.module.css";
import { useRouter } from "next/navigation";

export default function TeamsPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0); // 0: roster, 1: builder, 2: session
  const [rosterSearch, setRosterSearch] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [newStudentGender, setNewStudentGender] = useState<"male" | "female">("male");

  // Class management state
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);

  // Student management state
  const [addStudentName, setAddStudentName] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Move student state
  const [movingStudentId, setMovingStudentId] = useState<string | null>(null);

  const newClassInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const addStudentInputRef = useRef<HTMLInputElement>(null);

  const {
    classes,
    activeClassId,
    currentTeams,
    generateTeams,
    updateTeamScore,
    saveSession,
    updateStudent,
    updateTeamName,
    moveStudentToTeam,
    resetTeamsState,
    presentStudentIds,
    togglePresence,
    markAllPresent,
    // Class CRUD
    addClass,
    removeClass,
    updateClass,
    setActiveClass,
    // Student CRUD
    addStudent,
    removeStudent,
    bulkAddStudents,
  } = useClassroomStore();

  const router = useRouter();

  const activeClass = useMemo(() => {
    if (!mounted) return null;
    return classes.find(c => c.id === activeClassId) || classes[0] || null;
  }, [classes, activeClassId, mounted]);

  useEffect(() => {
    if (activeClass && presentStudentIds.length === 0) {
      markAllPresent(activeClass.id);
    }
  }, [activeClass?.id, markAllPresent, presentStudentIds.length]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (showClassForm && newClassInputRef.current) newClassInputRef.current.focus();
  }, [showClassForm]);

  useEffect(() => {
    if (renameMode && renameInputRef.current) renameInputRef.current.focus();
  }, [renameMode]);

  if (!mounted) return (
    <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className={styles.headerTitle} style={{ opacity: 0.5, letterSpacing: '2px', fontFamily: 'JetBrains Mono' }}>INITIALIZING_COMMAND_ARRAY...</div>
    </div>
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleAddClass = () => {
    const name = newClassName.trim();
    if (!name) return;
    addClass(name);
    setNewClassName("");
    setShowClassForm(false);
  };

  const handleRenameClass = () => {
    const name = renameValue.trim();
    if (!name || !activeClass) return;
    updateClass(activeClass.id, name);
    setRenameMode(false);
    setRenameValue("");
  };

  const handleDeleteClass = () => {
    if (!activeClass) return;
    removeClass(activeClass.id);
    setConfirmDeleteClass(false);
  };

  const handleAddStudent = () => {
    const name = addStudentName.trim();
    if (!name || !activeClass) return;
    addStudent(activeClass.id, name, newStudentGender);
    setAddStudentName("");
    addStudentInputRef.current?.focus();
  };

  const handleBulkAdd = () => {
    if (!activeClass) return;
    const names = bulkText.split("\n").map(n => n.trim()).filter(Boolean);
    if (names.length > 0) {
      bulkAddStudents(activeClass.id, names, newStudentGender);
      setBulkText("");
      setShowBulkAdd(false);
    }
  };

  const handleRemoveStudent = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeClass) return;
    removeStudent(activeClass.id, studentId);
    // Remove from presence if present
    if (presentStudentIds.includes(studentId)) {
      togglePresence(studentId);
    }
  };

  // ── Attendance Sync Helper ──
  const syncAttendance = async (studentName: string, status: string, className: string) => {
    // PASTE YOUR GOOGLE WEB APP URL HERE:
    const GOOGLE_SCRIPT_URL = ""; 
    
    if (!GOOGLE_SCRIPT_URL) return;

    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Critical for Apps Script redirect handling
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, status, className })
      });
    } catch (err) {
      console.error("Attendance Sync Failed:", err);
    }
  };


  const handleCycleStat = (studentId: string, statType: 'level' | 'energy' | 'confidence' | 'gender', e: React.MouseEvent) => {
    e.stopPropagation();
    const levels: Level[] = ["Low", "Mid", "High"];
    const energies: Energy[] = ["Passive", "Normal", "Active"];
    const genders: ("male" | "female")[] = ["male", "female"];
    const student = activeClass?.students.find(s => s.id === studentId);
    if (!student || !activeClass) return;
    
    if (statType === 'level' || statType === 'confidence') {
      const current = student[statType] as Level;
      const nextIdx = (levels.indexOf(current) + 1) % levels.length;
      updateStudent(activeClass.id, studentId, { [statType]: levels[nextIdx] });
    } else if (statType === 'energy') {
      const current = student.energy;
      const nextIdx = (energies.indexOf(current) + 1) % energies.length;
      updateStudent(activeClass.id, studentId, { energy: energies[nextIdx] });
    } else if (statType === 'gender') {
      const current = student.gender || 'male';
      const nextIdx = (genders.indexOf(current) + 1) % genders.length;
      updateStudent(activeClass.id, studentId, { gender: genders[nextIdx] });
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
    const sorted = [...currentTeams].sort((a, b) => b.score - a.score);
    return sorted[0].score - sorted[sorted.length - 1].score;
  };

  const finishSession = () => {
    if (!activeClass) return;
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

  // ─── Data ─────────────────────────────────────────────────────────────────

  const teamHex = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];
  const flColor = { Low: '#ff8080', Mid: '#ffc843', High: '#00e87a' };
  const enColor = { Passive: '#4a637d', Normal: '#00c8f0', Active: '#ff7d3b' };
  const coColor = { Low: '#ff8080', Mid: '#ffc843', High: '#b06eff' };

  const filteredStudents = (activeClass?.students ?? []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(rosterSearch.toLowerCase());
    const matchesGender = genderFilter === "all" || (s.gender || 'male') === genderFilter;
    return matchesSearch && matchesGender;
  });

  const isSelected = (id: string) => presentStudentIds.includes(id);

  const presentCount = (activeClass?.students ?? []).filter(s => isSelected(s.id)).length;
  const absentCount = (activeClass?.students.length ?? 0) - presentCount;

  const rosterStats = {
    highFluency: (activeClass?.students ?? []).filter(s => s.level === "High").length,
    midFluency: (activeClass?.students ?? []).filter(s => s.level === "Mid").length,
    lowFluency: (activeClass?.students ?? []).filter(s => s.level === "Low").length,
    activeEnergy: (activeClass?.students ?? []).filter(s => s.energy === "Active").length,
    highConf: (activeClass?.students ?? []).filter(s => s.confidence === "High").length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.headerBanner} />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className={styles.breadcrumb}>PERSONNEL_COMMAND // <span>{activeClass?.name ?? "NO UNIT"}</span></div>
          <h1 className={styles.headerTitle}>SQUAD OPERATIONS</h1>
        </div>
        <div className={styles.headerActions} style={{ position: 'relative', zIndex: 2 }}>
          {activeClass && (
            <span className={styles.tag + ' ' + styles.tagCyan}>{activeClass.students.length} Students</span>
          )}
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push("/dashboard")}>⇄ Dashboard</button>
        </div>
      </div>

      {/* ── Class Management Bar ─────────────────────────────────────────────── */}
      <div className={styles.classBar}>
        <div className={styles.classBarLeft}>
          <span className={styles.classBarLabel}>Class:</span>

          {/* All class chips */}
          {classes.map(cls => (
            <button
              key={cls.id}
              className={`${styles.classChip} ${activeClassId === cls.id ? styles.classChipActive : ''}`}
              onClick={() => { setActiveClass(cls.id); setRenameMode(false); setConfirmDeleteClass(false); }}
            >
              {cls.name}
            </button>
          ))}

          {/* New class inline form */}
          {showClassForm ? (
            <div className={styles.classInlineForm}>
              <input
                ref={newClassInputRef}
                className={styles.classInlineInput}
                placeholder="Class name…"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddClass(); if (e.key === 'Escape') { setShowClassForm(false); setNewClassName(""); } }}
              />
              <button className={`${styles.classInlineBtn} ${styles.classInlineBtnConfirm}`} onClick={handleAddClass}>✓</button>
              <button className={`${styles.classInlineBtn}`} onClick={() => { setShowClassForm(false); setNewClassName(""); }}>✕</button>
            </div>
          ) : (
            <button className={styles.classChipAdd} onClick={() => setShowClassForm(true)}>＋ New Class</button>
          )}
        </div>

        {/* Active class actions */}
        {activeClass && !showClassForm && (
          <div className={styles.classBarRight}>
            {renameMode ? (
              <div className={styles.classInlineForm}>
                <input
                  ref={renameInputRef}
                  className={styles.classInlineInput}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameClass(); if (e.key === 'Escape') setRenameMode(false); }}
                />
                <button className={`${styles.classInlineBtn} ${styles.classInlineBtnConfirm}`} onClick={handleRenameClass}>✓</button>
                <button className={styles.classInlineBtn} onClick={() => setRenameMode(false)}>✕</button>
              </div>
            ) : confirmDeleteClass ? (
              <div className={styles.classInlineForm}>
                <span className={styles.classDeletePrompt}>Delete "{activeClass.name}"?</span>
                <button className={`${styles.classInlineBtn} ${styles.classInlineBtnDanger}`} onClick={handleDeleteClass}>Delete</button>
                <button className={styles.classInlineBtn} onClick={() => setConfirmDeleteClass(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <button
                  className={styles.classActionBtn}
                  onClick={() => { setRenameValue(activeClass.name); setRenameMode(true); }}
                  title="Rename this class"
                >
                  ✎ Rename
                </button>
                <button
                  className={`${styles.classActionBtn} ${styles.classActionBtnDanger}`}
                  onClick={() => setConfirmDeleteClass(true)}
                  title="Delete this class"
                >
                  🗑 Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* No class state */}
      {!activeClass && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
          <p style={{ color: '#4a637d', fontSize: '14px', marginBottom: '20px' }}>
            No class selected. Create one above to get started.
          </p>
        </div>
      )}

      {activeClass && (
        <>
          {/* ── STEPPER ─────────────────────────────────────────────────────── */}
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

          <div className={styles.view}>

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 1: ROSTER
            ═══════════════════════════════════════════════════════════════ */}
            {step === 0 && (
              <>
                <div className={styles.rosterToolbar}>
                  <input
                    className={styles.rosterSearch}
                    placeholder="Search student…"
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                  />
                  <div className={styles.rosterStats}>
                    <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#00e87a' }}>{rosterStats.highFluency}</div><div className={styles.rstatLabel}>High Fluency</div></div>
                    <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#ffc843' }}>{rosterStats.midFluency}</div><div className={styles.rstatLabel}>Mid Fluency</div></div>
                    <div className={styles.rstat}><div className={styles.rstatVal} style={{ color: '#ff8080' }}>{rosterStats.lowFluency}</div><div className={styles.rstatLabel}>Low Fluency</div></div>
                    <div className={styles.rstat} style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className={styles.rstatLabel} style={{ marginBottom: '0', textAlign: 'left', whiteSpace: 'nowrap' }}>PERSONNEL FILTER</div>
                      <div className={styles.genderFilterRow}>
                        <button className={`${styles.genderBtn} ${genderFilter === 'all' ? styles.genderBtnActive : ''}`} onClick={() => setGenderFilter('all')}>All</button>
                        <button className={`${styles.genderBtn} ${genderFilter === 'male' ? styles.genderBtnActive : ''}`} onClick={() => setGenderFilter('male')}>Boys</button>
                        <button className={`${styles.genderBtn} ${genderFilter === 'female' ? styles.genderBtnActive : ''}`} onClick={() => setGenderFilter('female')}>Girls</button>
                      </div>
                    </div>
                  </div>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => { generateTeams(activeClass.id, teamCount, presentStudentIds); setStep(1); }}
                    disabled={presentCount < 2}
                  >
                    → Generate Teams ({presentCount} present)
                  </button>
                </div>

                {/* Absent summary bar */}
                {absentCount > 0 && (
                  <div className={styles.absentBar}>
                    <span className={styles.absentBarIcon}>🚫</span>
                    <span>{absentCount} student{absentCount > 1 ? 's' : ''} marked absent — they will be excluded from teams.</span>
                    <button className={styles.absentBarReset} onClick={() => {
                      if (activeClass) {
                        activeClass.students.forEach(s => {
                          if (!presentStudentIds.includes(s.id)) togglePresence(s.id);
                        });
                      }
                    }}>
                      Mark All Present
                    </button>
                  </div>
                )}

                <div className={styles.rosterGrid}>
                  {filteredStudents.map(s => {
                    const isPresent = isSelected(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`${styles.studentCard} ${isPresent ? styles.studentCardActive : styles.studentCardAbsent}`}
                      >
                        {/* Card top: name + remove */}
                        {/* Main Identity Area (Left) */}
                        <div className={styles.studentCardMain}>
                          <div className={`${styles.studentHeader} ${styles['tier' + (s.tier || 'Bronze')]}`}>
                            <div className={styles.rankIconLarge}>
                                <img 
                                  src={`/ui/ranks/${(s.rank || 1) === 1 ? '1star' : (s.rank || 1) === 2 ? '2star' : '3star'}.svg`} 
                                  alt="rank"
                                />
                            </div>
                            
                            <div className={styles.rankInfoSmall}>
                              <div className={styles.nameWrapper}>
                                <div className={`${styles.studentName} ${s.name.length > 14 ? styles.nameMarquee : ''} ${!isPresent ? styles.studentNameAbsent : ''}`}>
                                  {s.name}
                                </div>
                              </div>
                              <div className={`${styles.tierLabelSmall} ${styles['tier' + (s.tier || 'Bronze')]}`}>
                                {(s.rank || 1) === 1 ? 'RIVAL' : (s.rank || 1) === 2 ? 'HERO' : 'LEGEND'} — {(s.tier || 'Bronze').toUpperCase()} TIER
                              </div>
                            </div>

                            <button
                              className={`${styles.headerPresenceToggle} ${isPresent ? styles.presenceActive : styles.presenceInactive}`}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                togglePresence(s.id);
                                
                                // Automatic Google Sheets Sync
                                syncAttendance(s.name, !isPresent ? 'PRESENT' : 'ABSENT', activeClass.name);
                              }}
                            >
                              {isPresent ? '✓' : '✕'}
                            </button>
                          </div>
                          
                          <div className={styles.cardBody}>
                            <div className={styles.statsLayout}>
                              {/* English Fluency — Segmented Bar */}
                              <div className={styles.statLine} onClick={(e) => handleCycleStat(s.id, 'level', e)}>
                                <div className={styles.statHeader}>
                                  <span className={styles.statLabel}>FLUENCY</span>
                                  <span className={styles.statValue}>{(s.level || 'Mid').toUpperCase()}</span>
                                </div>
                                <div className={styles.segmentedBar}>
                                  <div className={`${styles.segment} ${styles.fluencyColor} ${['Low', 'Mid', 'High'].indexOf(s.level || 'Mid') >= 0 ? styles.lit : ''}`} />
                                  <div className={`${styles.segment} ${styles.fluencyColor} ${['Mid', 'High'].indexOf(s.level || 'Mid') >= 0 ? styles.lit : ''}`} />
                                  <div className={`${styles.segment} ${styles.fluencyColor} ${['High'].indexOf(s.level || 'Mid') >= 0 ? styles.lit : ''}`} />
                                </div>
                              </div>

                              <div className={styles.statsSecondaryRow}>
                                {/* Energy — Segmented Bar */}
                                <div className={styles.statLineSmall} onClick={(e) => handleCycleStat(s.id, 'energy', e)}>
                                  <div className={styles.statHeader}>
                                    <span className={styles.statLabel}>ENERGY</span>
                                  </div>
                                  <div className={styles.segmentedBarSmall}>
                                    <div className={`${styles.segment} ${styles.energyColor} ${['Passive', 'Normal', 'Active'].indexOf(s.energy || 'Normal') >= 0 ? styles.lit : ''}`} />
                                    <div className={`${styles.segment} ${styles.energyColor} ${['Normal', 'Active'].indexOf(s.energy || 'Normal') >= 0 ? styles.lit : ''}`} />
                                    <div className={`${styles.segment} ${styles.energyColor} ${['Active'].indexOf(s.energy || 'Normal') >= 0 ? styles.lit : ''}`} />
                                  </div>
                                </div>

                                {/* Confidence — Segmented Bar */}
                                <div className={styles.statLineSmall} onClick={(e) => handleCycleStat(s.id, 'confidence', e)}>
                                  <div className={styles.statHeader}>
                                    <span className={styles.statLabel}>CONFID.</span>
                                  </div>
                                  <div className={styles.segmentedBarSmall}>
                                    <div className={`${styles.segment} ${styles.confColor} ${['Low', 'Mid', 'High'].indexOf(s.confidence || 'Mid') >= 0 ? styles.lit : ''}`} />
                                    <div className={`${styles.segment} ${styles.confColor} ${['Mid', 'High'].indexOf(s.confidence || 'Mid') >= 0 ? styles.lit : ''}`} />
                                    <div className={`${styles.segment} ${styles.confColor} ${['High'].indexOf(s.confidence || 'Mid') >= 0 ? styles.lit : ''}`} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Sidebar (Right) — Now strictly for Avatar with Overlay Buttons */}
                        <div className={styles.studentCardSide}>
                          <div className={styles.studentCardActions}>
                            <button
                              className={styles.studentRemoveBtn}
                              onClick={(e) => handleRemoveStudent(s.id, e)}
                              title="Remove"
                            >
                              🗑
                            </button>
                          </div>

                          <div className={styles.avatarFrame} onClick={(e) => handleCycleStat(s.id, 'gender', e)}>
                            <div className={styles.avatarImgContainer}>
                              <img 
                                src={(s.gender || 'male') === 'female' ? '/ui/avatars/AvatarGirl.png?v=v3' : '/ui/avatars/AvatarBoy.png?v=v3'} 
                                alt="avatar" 
                                className={styles.avatarImg}
                              />
                            </div>
                            <div className={styles.avatarGenderTag} style={{ background: (s.gender || 'male') === 'female' ? 'var(--pink)' : 'var(--radar-blue)' }}>
                              {(s.gender || 'male') === 'female' ? '♀' : '♂'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add student card */}
                  <div className={styles.addStudentCard}>
                    <div className={styles.addStudentTitle}>＋ Add Student</div>
                    <div className={styles.addStudentGenderToggle}>
                      <button 
                        className={`${styles.genderSelectBtn} ${newStudentGender === 'male' ? styles.genderSelectBtnActive : ''}`}
                        onClick={() => setNewStudentGender('male')}
                      >
                        ♂ Male
                      </button>
                      <button 
                        className={`${styles.genderSelectBtn} ${newStudentGender === 'female' ? styles.genderSelectBtnActive : ''}`}
                        onClick={() => setNewStudentGender('female')}
                      >
                        ♀ Female
                      </button>
                    </div>
                    <input
                      ref={addStudentInputRef}
                      className={styles.addStudentInput}
                      placeholder="Student name…"
                      value={addStudentName}
                      onChange={e => setAddStudentName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddStudent(); }}
                    />
                    <div className={styles.addStudentButtons}>
                      <button
                        className={`${styles.btn} ${styles.btnCyan}`}
                        style={{ flex: 1 }}
                        onClick={handleAddStudent}
                        disabled={!addStudentName.trim()}
                      >
                        Add
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => setShowBulkAdd(v => !v)}
                        title="Bulk add (paste names)"
                      >
                        Bulk
                      </button>
                    </div>
                    {showBulkAdd && (
                      <>
                        <div className={styles.bulkGenderInfo}>* Global gender for bulk add: {newStudentGender}</div>
                        <textarea
                          className={styles.bulkTextarea}
                          placeholder={"One name per line:\nAhmad\nSiti\nBudi"}
                          value={bulkText}
                          onChange={e => setBulkText(e.target.value)}
                          rows={5}
                        />
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          style={{ width: '100%' }}
                          onClick={handleBulkAdd}
                          disabled={!bulkText.trim()}
                        >
                          Add {bulkText.split("\n").filter(l => l.trim()).length} Students
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 2: TEAM BUILDER
            ═══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <div className={styles.builderHeader}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(0)}>← Roster</button>
                    <button className={`${styles.btn} ${styles.btnCyan}`} onClick={() => generateTeams(activeClass.id, teamCount, presentStudentIds)}>↻ Re-generate</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => resetTeamsState()}>✕ Clear Scores</button>
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
                          generateTeams(activeClass.id, n, presentStudentIds);
                        }}
                      >
                        {[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} Teams</option>)}
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
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div className={styles.memberAvatar}>
                                <img 
                                  src={s.gender === 'female' ? '/AvatarGirl.png?v=v2' : '/AvatarBoy.png?v=v2'} 
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div>
                                <div className={styles.memberName}>{s.name}</div>
                                <div className={styles.memberMiniTags} style={{ marginTop: '3px' }}>
                                  <div className={styles.miniTag} style={{ background: flColor[s.level] }}></div>
                                  <div className={styles.miniTag} style={{ background: enColor[s.energy] }}></div>
                                  <div className={styles.miniTag} style={{ background: coColor[s.confidence] }}></div>
                                </div>
                              </div>
                            </div>
                            {/* Move student dropdown */}
                            <div style={{ position: 'relative' }}>
                              <button
                                className={styles.moveBtn}
                                onClick={() => setMovingStudentId(movingStudentId === s.id ? null : s.id)}
                              >
                                Move ▾
                              </button>
                              {movingStudentId === s.id && (
                                <div className={styles.moveDropdown}>
                                  {currentTeams.filter(t => t.id !== team.id).map((t, ti) => (
                                    <button
                                      key={t.id}
                                      className={styles.moveDropdownItem}
                                      style={{ color: teamHex[currentTeams.findIndex(x => x.id === t.id) % teamHex.length] }}
                                      onClick={() => { moveStudentToTeam(s.id, t.id); setMovingStudentId(null); }}
                                    >
                                      → {t.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 3: LIVE SESSION
            ═══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>← Teams</button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={finishSession}>✕ End Session</button>
                  </div>
                </div>

                <div className={styles.sessionTop} style={{ gridTemplateColumns: `repeat(${currentTeams.length}, 1fr)` }}>
                  {[...currentTeams].sort((a, b) => b.score - a.score).map((team, i) => {
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
                            {Math.round(team.score / (currentTeams.reduce((a, b) => a + b.score, 0) || 1) * 100)}% of total
                          </div>
                          {rank === 1 && currentTeams.length > 1 && (
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ffc843' }}>
                              +{(team.score - ([...currentTeams].sort((a, b) => b.score - a.score)[1]?.score || 0)).toLocaleString()} lead
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
                    <strong>{[...currentTeams].sort((a, b) => b.score - a.score)[0]?.name}</strong> is leading by <strong>{calculateGap().toLocaleString()} pts</strong> — consider a catch-up round.
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
                          width: `${(team.score / (currentTeams.reduce((a, b) => a + b.score, 0) || 1)) * 100}%`,
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
              </>
            )}

          </div>
        </>
      )}
    </div>
  );
}
