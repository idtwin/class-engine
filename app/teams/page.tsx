"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useClassroomStore, Student, Level, Energy, Team } from "../store/useClassroomStore";
import styles from "./teams.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RankIcon from "../components/RankIcon";

export default function TeamsPage() {
  const [mounted, setMounted] = useState(false);
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // OTP State
  const [otps, setOtps] = useState<Record<string, string>>({});
  const [generatingOtpId, setGeneratingOtpId] = useState<string | null>(null);

  const handleGenerateOtp = async (studentId: string, studentName: string, className: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingOtpId(studentId);
    try {
      const res = await fetch("/api/auth/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roster_id: studentId, name: studentName, class_name: className }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtps(prev => ({ ...prev, [studentId]: data.otp }));
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setGeneratingOtpId(null);
  };

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
    moveStudentToBench,
    resetTeamsState,
    currentStep,
    setStep,
    presentStudentIds,
    unassignedStudents,
    togglePresence,
    markAllPresent,
    awardStudentXp,
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

  useEffect(() => {
    if (mounted && currentTeams.length > 0) {
      setTeamCount(currentTeams.length);
    }
  }, [mounted, currentTeams.length]);

  const activeClass = useMemo(() => {
    if (!mounted) return null;
    return classes.find(c => c.id === activeClassId) || classes[0] || null;
  }, [classes, activeClassId, mounted]);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [classes]);

  useEffect(() => {
    if (activeClass && presentStudentIds.length === 0) {
      markAllPresent(activeClass.id);
    }
  }, [activeClass?.id, markAllPresent, presentStudentIds.length]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Migration: Ensure all students use the new role-based tiers (Hero/Legend/Immortal)
  useEffect(() => {
    if (activeClass) {
      activeClass.students.forEach(s => {
        // @ts-ignore - checking for legacy metallic strings
        if (s.tier === "Bronze")   updateStudent(activeClass.id, s.id, { tier: "Hero" });
        // @ts-ignore
        if (s.tier === "Silver")   updateStudent(activeClass.id, s.id, { tier: "Legend" });
        // @ts-ignore
        if (s.tier === "Gold")     updateStudent(activeClass.id, s.id, { tier: "Immortal" });
        // @ts-ignore
        if (s.tier === "Platinum") updateStudent(activeClass.id, s.id, { tier: "Immortal", rank: 4 });
      });
    }
  }, [activeClass?.id, updateStudent]);

  useEffect(() => {
    if (showClassForm && newClassInputRef.current) newClassInputRef.current.focus();
  }, [showClassForm]);

  useEffect(() => {
    if (renameMode && renameInputRef.current) renameInputRef.current.focus();
  }, [renameMode]);

  useEffect(() => {
    setMovingStudentId(null);
  }, [currentStep]);

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
    const lines = bulkText.split("\n").filter(l => l.trim());
    if (lines.length === 0) return;

    const studentData: { name: string, gender: "male" | "female" }[] = lines.map(line => {
      let name = line.trim();
      let gender: 'male' | 'female' = 'male';

      if (name.toLowerCase().includes("(f)") || name.toLowerCase().includes(",f")) {
        gender = 'female';
        name = name.replace(/\(f\)/gi, "").replace(/,f/gi, "").trim();
      } else if (name.toLowerCase().includes("(m)") || name.toLowerCase().includes(",m")) {
        gender = 'male';
        name = name.replace(/\(m\)/gi, "").replace(/,m/gi, "").trim();
      }
      return { name, gender };
    });

    bulkAddStudents(activeClass.id, studentData);
    setBulkText("");
    setShowBulkAdd(false);
  };

  const handleRemoveStudent = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeClass) return;
    removeStudent(activeClass.id, studentId);
    setConfirmingDeleteId(null);
  };

  const syncAttendance = async (studentName: string, status: string, className: string) => {
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzT-gtBYDwgOyijewpt1AdadYEGigWezZH8-8P5qYrhVtEGvHyegBHNmCizt0Nhn2FC/exec";
    if (!GOOGLE_SCRIPT_URL || !studentName.trim()) return;
    try {
      const queryParams = new URLSearchParams({ studentName, status, className }).toString();
      fetch(`${GOOGLE_SCRIPT_URL}?${queryParams}`, { method: 'GET', mode: 'no-cors' });
    } catch (err) {
      console.error("Attendance Sync Failed:", err);
    }
  };

  const syncBulkAttendance = async (className: string) => {
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzT-gtBYDwgOyijewpt1AdadYEGigWezZH8-8P5qYrhVtEGvHyegBHNmCizt0Nhn2FC/exec";
    if (!activeClass || !GOOGLE_SCRIPT_URL) return;
    try {
      const queryParams = new URLSearchParams({
        type: 'bulk',
        className: className,
        count: activeClass.students.length.toString()
      }).toString();
      await fetch(`${GOOGLE_SCRIPT_URL}?${queryParams}`, { method: 'GET', mode: 'no-cors' });

      const absentStudents = activeClass.students.filter(s => s.name.trim() && !isSelected(s.id));
      if (absentStudents.length > 0) {
        absentStudents.forEach((s, index) => {
          setTimeout(() => {
            syncAttendance(s.name, 'a', className);
          }, index * 200);
        });
      }
    } catch (err) {
      console.error("Bulk Sync Failed:", err);
    }
  };

  const setStat = (studentId: string, statType: 'level' | 'energy' | 'confidence', value: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeClass) return;
    updateStudent(activeClass.id, studentId, { [statType]: value });
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
  const flColor = { Low: '#ff8080', Mid: '#ffc843', High: '#00c8f0' };
  const enColor = { Passive: '#4a637d', Normal: '#00c8f0', Active: '#ff7d3b' };
  const coColor = { Low: '#ff8080', Mid: '#ffc843', High: '#ffc843' };

  const filteredStudents = (activeClass?.students ?? [])
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchesGender = genderFilter === "all" || (s.gender || 'male') === genderFilter;
      return matchesSearch && matchesGender;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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

          {sortedClasses.map(cls => (
            <button
              key={cls.id}
              className={`${styles.classChip} ${activeClassId === cls.id ? styles.classChipActive : ''}`}
              onClick={() => { setActiveClass(cls.id); setRenameMode(false); setConfirmDeleteClass(false); }}
            >
              {cls.name}
            </button>
          ))}

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
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className={styles.classActionBtn}
                  style={{ color: '#c4ff00', borderColor: 'rgba(196, 255, 0, 0.4)', background: 'rgba(196, 255, 0, 0.05)' }}
                  onClick={() => syncBulkAttendance(activeClass.name)}
                >
                  <span style={{ fontSize: '10px' }}>↻</span> SYNC
                </button>
                <button
                  className={styles.classActionBtn}
                  onClick={() => { setRenameValue(activeClass.name); setRenameMode(true); }}
                >
                  <span style={{ fontSize: '10px' }}>✎</span> RENAME
                </button>
                <button
                  className={`${styles.classActionBtn} ${styles.classActionBtnDanger}`}
                  style={{ color: '#ff3333', borderColor: 'rgba(255, 51, 51, 0.4)', background: 'rgba(255, 51, 51, 0.05)' }}
                  onClick={() => setConfirmDeleteClass(true)}
                >
                  <span style={{ fontSize: '10px' }}>🗑</span> DELETE
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
            <div className={`${styles.step} ${currentStep === 0 ? styles.stepActive : styles.stepDone}`} onClick={() => setStep(0)}>
              <div className={styles.stepNum}>{currentStep > 0 ? "✓" : "1"}</div>
              ROSTER SETUP
            </div>
            <div className={styles.stepDivider}></div>
            <div className={`${styles.step} ${currentStep === 1 ? styles.stepActive : currentStep > 1 ? styles.stepDone : ""}`} onClick={() => currentStep >= 1 && setStep(1)}>
              <div className={styles.stepNum}>{currentStep > 1 ? "✓" : "2"}</div>
              TEAM BUILDER
            </div>
            <div className={styles.stepDivider}></div>
            <div className={`${styles.step} ${currentStep === 2 ? styles.stepActive : ""}`} onClick={() => currentStep >= 2 && setStep(2)}>
              <div className={styles.stepNum}>3</div>
              LIVE SESSION
            </div>
          </div>

          <div className={styles.view}>

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 1: ROSTER
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 0 && (
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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {currentTeams.length > 0 && (
                      <div className={styles.statusIndicator}>
                        <div className={`${styles.statusDot} ${styles.statusDotActive}`}></div>
                        <span>Session Active</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {currentTeams.length > 0 && (
                        <button
                          className={`${styles.btn} ${styles.btnGreen}`}
                          onClick={() => setStep(1)}
                        >
                          ▶ Resume Mission
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${currentTeams.length > 0 ? styles.btnGhost : styles.btnPrimary}`}
                        onClick={() => {
                          if (currentTeams.length > 0 && !confirm("This will clear your current squads and data. Initialize new mission?")) return;
                          generateTeams(activeClass.id, teamCount, presentStudentIds);
                        }}
                        disabled={presentCount < 2}
                      >
                        {currentTeams.length > 0 ? "↻ Reset Squads" : `→ Initialize Squads`}
                      </button>
                    </div>
                  </div>
                </div>

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
                        {/* Main Identity Area (Left) */}
                        <div className={styles.studentCardMain}>
                          <div className={`${styles.studentHeader} ${styles['tier' + (s.tier || 'Hero')]}`}>
                            <div className={styles.rankIconLarge}>
                              <RankIcon tier={s.tier} stars={s.rank as any} size={50} />
                            </div>

                            <Link
                              href={`/profile/${s.id}`}
                              className={styles.rankInfoSmall}
                              style={{ textDecoration: 'none', cursor: 'pointer' }}
                            >
                              <div className={styles.nameWrapper}>
                                <div className={`${styles.studentName} ${s.name.length > 14 ? styles.nameMarquee : ''} ${!isPresent ? styles.studentNameAbsent : ''}`}>
                                  {s.name}
                                </div>
                              </div>
                              <div className={`${styles.tierLabelSmall} ${styles['tier' + s.tier]}`}>
                                {s.tier?.toUpperCase()} {s.rank === 1 ? 'BRONZE' : s.rank === 2 ? 'SILVER' : s.rank === 3 ? 'GOLD' : 'PLATINUM'}
                              </div>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#4a637d', marginTop: '2px', marginBottom: '2px', letterSpacing: '0.05em' }}>
                                {(s.xp ?? 0).toLocaleString()} XP
                              </div>
                            </Link>

                            <div className={styles.headerStatusGroup}>
                              <button
                                className={`${styles.headerPresenceToggle} ${isPresent ? styles.presenceActive : styles.presenceInactive}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus = isPresent ? 'a' : 'p';
                                  togglePresence(s.id);
                                  syncAttendance(s.name, nextStatus, activeClass.name);
                                }}
                              >
                                {isPresent ? '✓' : '✕'}
                              </button>
                            </div>
                          </div>

                          <div className={styles.cardBody}>
                            <div className={styles.statRows}>
                              {/* ROW 1: POWER (level: Low/Mid/High → Red/Yellow/Cyan) */}
                              {(() => {
                                const lv = s.level || 'Mid';
                                const c = lv === 'Low' ? styles.statLow : lv === 'High' ? styles.statHigh : styles.statMid;
                                return (
                                  <div className={styles.statRow}>
                                    <div className={styles.statHeader}>
                                      <span className={styles.statLabel}>POWER</span>
                                    </div>
                                    <div className={styles.segmentedBar}>
                                      <div className={`${styles.segment} ${c} ${styles.lit}`} onClick={(e) => setStat(s.id, 'level', 'Low', e)} />
                                      <div className={`${styles.segment} ${c} ${['Mid','High'].includes(lv) ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'level', 'Mid', e)} />
                                      <div className={`${styles.segment} ${c} ${lv === 'High' ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'level', 'High', e)} />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ROW 2: ENERGY (Passive/Normal/Active → Red/Yellow/Cyan) */}
                              {(() => {
                                const en = s.energy || 'Normal';
                                const c = en === 'Passive' ? styles.statLow : en === 'Active' ? styles.statHigh : styles.statMid;
                                return (
                                  <div className={styles.statRow}>
                                    <div className={styles.statHeader}>
                                      <span className={styles.statLabel}>ENERGY</span>
                                    </div>
                                    <div className={styles.segmentedBar}>
                                      <div className={`${styles.segment} ${c} ${styles.lit}`} onClick={(e) => setStat(s.id, 'energy', 'Passive', e)} />
                                      <div className={`${styles.segment} ${c} ${['Normal','Active'].includes(en) ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'energy', 'Normal', e)} />
                                      <div className={`${styles.segment} ${c} ${en === 'Active' ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'energy', 'Active', e)} />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ROW 3: COMMAND (Low/Mid/High → Red/Yellow/Cyan) */}
                              {(() => {
                                const co = s.confidence || 'Mid';
                                const c = co === 'Low' ? styles.statLow : co === 'High' ? styles.statHigh : styles.statMid;
                                return (
                                  <div className={styles.statRow}>
                                    <div className={styles.statHeader}>
                                      <span className={styles.statLabel}>COMMAND</span>
                                    </div>
                                    <div className={styles.segmentedBar}>
                                      <div className={`${styles.segment} ${c} ${styles.lit}`} onClick={(e) => setStat(s.id, 'confidence', 'Low', e)} />
                                      <div className={`${styles.segment} ${c} ${['Mid','High'].includes(co) ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'confidence', 'Mid', e)} />
                                      <div className={`${styles.segment} ${c} ${co === 'High' ? styles.lit : ''}`} onClick={(e) => setStat(s.id, 'confidence', 'High', e)} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className={styles.studentActionRow}>
                              <button
                                className={`${styles.studentRemoveBtn} ${confirmingDeleteId === s.id ? styles.confirming : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirmingDeleteId === s.id) {
                                    handleRemoveStudent(s.id, e);
                                  } else {
                                    setConfirmingDeleteId(s.id);
                                    setTimeout(() => setConfirmingDeleteId(null), 3000);
                                  }
                                }}
                                title={confirmingDeleteId === s.id ? "Confirm Deletion" : "Remove Student"}
                              >
                                <span className={styles.removeIcon}>{confirmingDeleteId === s.id ? '⚠️' : '🗑'}</span>
                                <span className={styles.removeLabel}>{confirmingDeleteId === s.id ? 'SURE?' : 'REMOVE'}</span>
                              </button>

                              <button
                                className={styles.pinBtnDotted}
                                onClick={(e) => handleGenerateOtp(s.id, s.name, activeClass.name, e)}
                                disabled={generatingOtpId === s.id}
                              >
                                {generatingOtpId === s.id ? '...' : (otps[s.id] || 'GET PIN')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Avatar Column (Right) */}
                        <div className={styles.studentCardSide}>
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
                    <div className={styles.addStudentTitle}>+ ADD STUDENT</div>

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
                      placeholder="Student name.."
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
                        ADD
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => setShowBulkAdd(v => !v)}
                        title="Bulk add (paste names)"
                      >
                        BULK
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tactical Bulk Add Overlay */}
                {showBulkAdd && (
                  <div className={styles.bulkOverlay}>
                    <div className={styles.bulkModal}>
                      <div className={styles.bulkHeader}>
                        <div className={styles.bulkTitle}>
                          <span className={styles.bulkTitleIcon}>📝</span>
                          NEURAL_ROSTER_INGESTION
                        </div>
                        <button className={styles.bulkClose} onClick={() => setShowBulkAdd(false)}>✕</button>
                      </div>

                      <div className={styles.bulkBody}>
                        <div className={styles.bulkInstructions}>
                          PASTE ROSTER: Use <strong>(m)</strong> or <strong>(f)</strong> for gender, or leave blank for default.
                          <br /><em>Example: John (m), Jane (f), Ahmad</em>
                        </div>

                        <textarea
                          className={styles.bulkTextareaModal}
                          placeholder={"John (m)\nJane (f)\nAhmad\n..."}
                          value={bulkText}
                          onChange={e => setBulkText(e.target.value)}
                          autoFocus
                        />

                        <div className={styles.bulkFooter}>
                          <div className={styles.bulkCount}>
                            {bulkText.split("\n").filter(l => l.trim()).length} OPERATIVES IDENTIFIED
                          </div>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button className={styles.btnAbort} onClick={() => setShowBulkAdd(false)}>ABORT_LINK</button>
                            <button
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              onClick={handleBulkAdd}
                              disabled={!bulkText.trim()}
                            >
                              INITIATE MASS INGESTION
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 2: TEAM BUILDER
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
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

                <div className={styles.teamsGrid} style={{ gridTemplateColumns: `repeat(${Math.min(4, currentTeams.length)}, 1fr)` }}>
                  {currentTeams.map((team, i) => {
                    const avgPower = getTeamStat(team, 'level');
                    const avgEnergy = getTeamStat(team, 'energy');
                    const avgCommand = getTeamStat(team, 'confidence');
                    const overallStrength = Math.round((avgPower + avgEnergy + avgCommand) / 3);

                    return (
                      <div key={team.id} className={styles.teamCard} style={{ borderTop: `2px solid ${team.color}` }}>
                        <div className={styles.teamHeader}>
                          <div className={styles.teamNameRow}>
                            <div className={styles.teamDot} style={{ background: team.color, boxShadow: `0 0 6px ${team.color}` }}></div>
                            <div className={styles.teamName} style={{ color: team.color }}>{team.name}</div>
                            <div className={styles.squadRating} title="Overall Squad Rating">OSR {overallStrength}</div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#4a637d' }}>{team.students.length} students</div>
                          </div>

                          <div className={styles.teamStatsSummary}>
                            <div className={styles.teamStat}>
                              <div className={styles.teamStatLabel}>POWER</div>
                              <div className={styles.teamStatBar}>
                                <div className={styles.teamStatFill} style={{ width: `${avgPower}%`, background: 'var(--stat-power)' }} />
                              </div>
                              <div className={styles.teamStatVal} style={{ color: 'var(--stat-power)' }}>{avgPower}%</div>
                            </div>
                            <div className={styles.teamStat}>
                              <div className={styles.teamStatLabel}>ENERGY</div>
                              <div className={styles.teamStatBar}>
                                <div className={styles.teamStatFill} style={{ width: `${avgEnergy}%`, background: 'var(--stat-energy)' }} />
                              </div>
                              <div className={styles.teamStatVal} style={{ color: 'var(--stat-energy)' }}>{avgEnergy}%</div>
                            </div>
                            <div className={styles.teamStat}>
                              <div className={styles.teamStatLabel}>COMMAND</div>
                              <div className={styles.teamStatBar}>
                                <div className={styles.teamStatFill} style={{ width: `${avgCommand}%`, background: 'var(--stat-command)' }} />
                              </div>
                              <div className={styles.teamStatVal} style={{ color: 'var(--stat-command)' }}>{avgCommand}%</div>
                            </div>
                          </div>
                        </div>
                        <div className={styles.teamMembers}>
                          {team.students.map(s => (
                            <div key={s.id} className={styles.memberRow}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div>
                                  <div className={styles.memberName}>{s.name}</div>
                                  <div className={styles.memberMiniTags} style={{ marginTop: '3px' }}>
                                    <div className={styles.miniTag} style={{ background: flColor[s.level] }}></div>
                                    <div className={styles.miniTag} style={{ background: enColor[s.energy] }}></div>
                                    <div className={styles.miniTag} style={{ background: coColor[s.confidence] }}></div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ position: 'relative' }}>
                                <button
                                  className={styles.moveBtn}
                                  onClick={() => setMovingStudentId(movingStudentId === s.id ? null : s.id)}
                                >
                                  Move ▾
                                </button>
                                {movingStudentId === s.id && (
                                  <div className={styles.moveDropdown}>
                                    {currentTeams.filter(t => t.id !== team.id).map((t) => (
                                      <button
                                        key={t.id}
                                        className={styles.moveDropdownItem}
                                        style={{ color: t.color }}
                                        onClick={() => { moveStudentToTeam(s.id, t.id); setMovingStudentId(null); }}
                                      >
                                        → {t.name}
                                      </button>
                                    ))}
                                    <button
                                      className={styles.moveDropdownItem}
                                      style={{ color: 'var(--muted)', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }}
                                      onClick={() => { moveStudentToBench(s.id); setMovingStudentId(null); }}
                                    >
                                      ⇊ Bench
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* HOLDING AREA (BENCH) */}
                {unassignedStudents.length > 0 && (
                  <div className={styles.benchSection}>
                    <div className={styles.benchHeader}>
                      <div className={styles.benchTitle}>[ PERSONNEL HOLDING AREA ]</div>
                      <div className={styles.benchSub}>UNASSIGNED OPERATIVES DETECTED</div>
                    </div>
                    <div className={styles.benchGrid}>
                      {unassignedStudents.map(s => (
                        <div key={s.id} className={styles.benchCard}>
                          <div className={styles.benchCardGlow}></div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className={styles.memberName} style={{ fontSize: '11px', opacity: 0.8 }}>{s.name}</div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <button
                              className={styles.moveBtn}
                              onClick={() => setMovingStudentId(movingStudentId === s.id ? null : s.id)}
                            >
                              Move ▾
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                VIEW 3: LIVE SESSION
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <div className={styles.arenaLayout}>
                {/* COLUMN 1: SQUAD INTEL */}
                <div className={styles.arenaColumn}>
                  <div>
                    <div className={styles.intelTitle}>SQUAD_HERALDRY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      {currentTeams.map(team => (
                        <div key={team.id} className={styles.squadCard} style={{ '--team-color': team.color } as any}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <div className={styles.crestContainer} style={{ '--team-color': team.color } as any}>
                              <img src={team.crestUrl} className={styles.crestImg} alt={team.name} />
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: team.color }}>{team.name}</div>
                              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>OSR: {team.osr ?? 0} // {team.students.length} OPS</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {team.students.map(s => (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>{s.xp || 0} XP</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: LEADERBOARD HUB */}
                <div className={styles.arenaColumn} style={{ alignItems: 'center', padding: '40px' }}>
                  <div className={styles.trophyCase}>
                    <div style={{ fontSize: '10px', letterSpacing: '8px', color: 'var(--command-orange)', marginBottom: '20px' }}>SEASON_LEADING_SQUAD</div>
                    <img src="/arena_trophy_gold_1776948914488.png" className={styles.trophyImg} alt="Trophy" />
                    <div style={{ fontFamily: 'Syne, var(--font-main)', fontSize: '32px', color: 'white', marginTop: '20px', fontWeight: 800 }}>
                      {(currentTeams.length > 0 ? [...currentTeams].sort((a, b) => b.score - a.score)[0].name : "NO_DATA").toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--command-orange)', marginTop: '5px' }}>RANK #1 // PRESTIGE_TIER</div>
                  </div>

                  <div className={styles.intelPanel} style={{ width: '100%', marginTop: '40px' }}>
                    <div className={styles.intelTitle}>LEADERBOARD_STATUS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[...currentTeams].sort((a, b) => b.score - a.score).map((team, i) => (
                        <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: i === 0 ? 'var(--command-orange)' : 'rgba(255,255,255,0.1)', width: '30px' }}>0{i + 1}</div>
                          <img src={team.crestUrl} style={{ width: '35px', height: '35px', mixBlendMode: 'screen' }} alt="" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: team.color }}>{team.name}</div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', marginTop: '8px' }}>
                              <div style={{ width: `${(team.score / ([...currentTeams].sort((a, b) => b.score - a.score)[0]?.score || 1)) * 100}%`, height: '100%', background: team.color }}></div>
                            </div>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: team.color }}>{team.score.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score Adjustment Controls */}
                  <div style={{ width: '100%', marginTop: '24px', display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, currentTeams.length)}, 1fr)`, gap: '10px' }}>
                    {currentTeams.map((team) => (
                      <div key={team.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: team.color, fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{team.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button className={styles.adjBtn} onClick={() => updateTeamScore(team.id, -100)}>−</button>
                          <div className={styles.adjScore} style={{ color: team.color }}>{team.score.toLocaleString()}</div>
                          <button className={styles.adjBtn} onClick={() => updateTeamScore(team.id, 100)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN 3: SESSION INTEL */}
                <div className={styles.arenaColumn}>
                  <div className={styles.intelPanel}>
                    <div className={styles.intelTitle}>MISSION_HISTORY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { game: 'CHAIN_REACTION', winner: 'SQUAD ALPHA', time: '14:20' },
                        { game: 'NEURAL_SPEED', winner: 'SQUAD DELTA', time: '14:45' },
                        { game: 'VOCAB_STRIKE', winner: 'SQUAD ALPHA', time: '15:10' }
                      ].map((entry, idx) => (
                        <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{entry.game}</div>
                            <div style={{ fontSize: '8px', color: 'var(--command-orange)', marginTop: '4px' }}>WINNER: {entry.winner}</div>
                          </div>
                          <div style={{ fontSize: '9px', opacity: 0.3 }}>{entry.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} style={{ width: '100%' }} onClick={() => setStep(1)}>← MODIFY_SQUADS</button>
                    <button className={styles.finalizeBtn} onClick={finishSession}>
                      <span>[</span> FINALIZE_MATCH_DATA <span>]</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
