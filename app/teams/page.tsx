"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useClassroomStore, Student, Level, Energy, Team } from "../store/useClassroomStore";
import styles from "./teams.module.css";
import { useRouter } from "next/navigation";
import GameLauncherDrawer from "../components/GameLauncherDrawer";
import RankIcon from "../components/RankIcon";
import { getRankForXp, getNextRankProgress } from "@/utils/ranks";
import { playSFX } from "../lib/audio";
import { Users, Plus, CheckCircle, XCircle, Shuffle, Play, Trash2, Edit2, Zap, ArrowRight, UserPlus, Upload, Shield, Award, Sparkles } from "lucide-react";

export default function TeamsPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'prep' | 'showcase'>('prep');
  const [gameDrawerOpen, setGameDrawerOpen] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [balanceStrategy, setBalanceStrategy] = useState<'balanced' | 'mixed_energy' | 'gender_balanced' | 'random'>('balanced');
  const [spotlightStudentId, setSpotlightStudentId] = useState<string | null>(null);

  // Class management state
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [renameClassNameText, setRenameClassNameText] = useState("");

  // Student management state
  const [addStudentName, setAddStudentName] = useState("");
  const [addStudentGender, setAddStudentGender] = useState<"male" | "female">("male");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [movingStudentId, setMovingStudentId] = useState<string | null>(null);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentGender, setEditStudentGender] = useState<"male" | "female">("male");
  const [editStudentLevel, setEditStudentLevel] = useState<Level>("Mid");
  const [editStudentEnergy, setEditStudentEnergy] = useState<Energy>("Normal");
  const [editStudentXp, setEditStudentXp] = useState<number>(0);

  // Google Sheets Sync State
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsTab, setSheetsTab] = useState<'copy' | 'webhook'>('copy');
  const [copyToast, setCopyToast] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const addStudentInputRef = useRef<HTMLInputElement>(null);

  const {
    classes,
    activeClassId,
    currentTeams,
    generateTeams,
    updateTeamScore,
    updateStudent,
    updateTeamName,
    moveStudentToTeam,
    moveStudentToBench,
    resetTeamsState,
    presentStudentIds,
    unassignedStudents,
    togglePresence,
    markAllPresent,
    awardStudentXp,
    addClass,
    removeClass,
    updateClass,
    setActiveClass,
    addStudent,
    removeStudent,
    bulkAddStudents,
    googleSheetsWebhookUrl,
    setGoogleSheetsWebhookUrl,
  } = useClassroomStore();

  const router = useRouter();

  const activeClass = useMemo(() => {
    if (!mounted) return null;
    return classes.find(c => c.id === activeClassId) || classes[0] || null;
  }, [classes, activeClassId, mounted]);

  const filteredStudents = useMemo(() => {
    return (activeClass?.students ?? [])
      .filter(s => s.name.toLowerCase().includes(rosterSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeClass, rosterSearch]);

  const isSelected = (id: string) => presentStudentIds.includes(id);
  const presentCount = (activeClass?.students ?? []).filter(s => isSelected(s.id)).length;
  const totalCount = activeClass?.students.length ?? 0;

  const handleCopyPAOnly = () => {
    if (!activeClass || activeClass.students.length === 0) return;
    // Exact original insertion order from activeClass.students
    const paList = activeClass.students
      .map(s => (presentStudentIds.includes(s.id) ? 'P' : 'A'))
      .join('\n');
    navigator.clipboard.writeText(paList);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  const handleCopyNameAndPA = () => {
    if (!activeClass || activeClass.students.length === 0) return;
    const text = activeClass.students
      .map(s => `${s.name}\t${presentStudentIds.includes(s.id) ? 'P' : 'A'}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  const handleDownloadCSV = () => {
    if (!activeClass || activeClass.students.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const header = "Student Name,Status";
    const body = activeClass.students
      .map(s => `"${s.name}","${presentStudentIds.includes(s.id) ? 'P' : 'A'}"`)
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${activeClass.name.replace(/\s+/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeClass && presentStudentIds.length === 0) {
      markAllPresent(activeClass.id);
    }
  }, [activeClass?.id, markAllPresent, presentStudentIds.length]);

  // Auto-generate teams on initial mount or when class changes
  useEffect(() => {
    if (mounted && activeClass && currentTeams.length === 0 && activeClass.students.length > 0) {
      generateTeams(activeClass.id, teamCount, presentStudentIds, balanceStrategy);
    }
  }, [mounted, activeClass?.id]);

  if (!mounted) return (
    <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'JetBrains Mono', color: '#00FFD5', letterSpacing: '2px' }}>LOADING_WORKSPACE...</div>
    </div>
  );

  const handleAddClass = () => {
    const name = newClassName.trim();
    if (!name) return;
    addClass(name);
    setNewClassName("");
    setShowClassForm(false);
  };

  const handleAddStudent = () => {
    const name = addStudentName.trim();
    if (!name || !activeClass) return;
    addStudent(activeClass.id, name, addStudentGender);
    setAddStudentName("");
    addStudentInputRef.current?.focus();
    setTimeout(() => {
      generateTeams(activeClass.id, teamCount, presentStudentIds, balanceStrategy);
    }, 50);
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
    setTimeout(() => {
      generateTeams(activeClass.id, teamCount, presentStudentIds, balanceStrategy);
    }, 50);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentGender(student.gender || "male");
    setEditStudentLevel(student.level || "Mid");
    setEditStudentEnergy(student.energy || "Normal");
    setEditStudentXp(student.xp || 0);
  };

  const handleSaveEditStudent = () => {
    if (!editingStudent || !activeClass || !editStudentName.trim()) return;
    updateStudent(activeClass.id, editingStudent.id, {
      name: editStudentName.trim(),
      gender: editStudentGender,
      level: editStudentLevel,
      energy: editStudentEnergy,
      xp: Number(editStudentXp) || 0
    });
    setEditingStudent(null);
    playSFX("correct");
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!activeClass) return;
    if (confirm(`Remove "${studentName}" from ${activeClass.name}?`)) {
      removeStudent(activeClass.id, studentId);
      setTimeout(() => {
        generateTeams(activeClass.id, teamCount, presentStudentIds, balanceStrategy);
      }, 50);
    }
  };

  const handleStartRenameClass = () => {
    if (!activeClass) return;
    setRenameClassNameText(activeClass.name);
    setIsRenamingClass(true);
  };

  const handleSaveRenameClass = () => {
    if (!activeClass || !renameClassNameText.trim()) return;
    updateClass(activeClass.id, renameClassNameText.trim());
    setIsRenamingClass(false);
    playSFX("correct");
  };

  const handleDeleteClass = (targetClassId: string, className: string) => {
    if (confirm(`Are you sure you want to delete classroom "${className}"? This will remove all student data for this class.`)) {
      removeClass(targetClassId);
      playSFX("correct");
    }
  };

  const handleToggleAttendance = (studentId: string) => {
    togglePresence(studentId);
    if (activeClass) {
      setTimeout(() => {
        const { presentStudentIds: updatedPresent } = useClassroomStore.getState();
        generateTeams(activeClass.id, teamCount, updatedPresent, balanceStrategy);
      }, 50);
    }
  };

  const handleSpotlightOperative = () => {
    if (!activeClass || activeClass.students.length === 0) return;
    const presentStudents = activeClass.students.filter(s => isSelected(s.id));
    if (presentStudents.length === 0) return;

    const randomStudent = presentStudents[Math.floor(Math.random() * presentStudents.length)];
    setSpotlightStudentId(randomStudent.id);
    playSFX("correct");

    setTimeout(() => {
      setSpotlightStudentId(null);
    }, 4000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.scanlines}></div>

      {/* Header Bar with View Switcher */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>TEACHER STUDIO // <span>SQUAD WORKSPACE</span></div>
          <h1 className={styles.headerTitle}>ROSTER & SQUAD STUDIO</h1>
        </div>

        {/* Dual Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '8px' }}>
          <button
            className={`${styles.btn} ${viewMode === 'prep' ? styles.btnPrimary : styles.btnGhost}`}
            style={{ fontSize: '12px', padding: '8px 16px' }}
            onClick={() => setViewMode('prep')}
          >
            🛠️ QUICK PREP
          </button>
          <button
            className={`${styles.btn} ${viewMode === 'showcase' ? styles.btnCyan : styles.btnGhost}`}
            style={{ fontSize: '12px', padding: '8px 16px' }}
            onClick={() => setViewMode('showcase')}
          >
            🪖 OPERATIVE SHOWCASE
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className={styles.classBar}>
        <div className={styles.classBarLeft}>
          <div className={styles.controlGroup}>
            <span className={styles.classBarLabel}>CLASS</span>
            {isRenamingClass ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  className={styles.modalInput}
                  style={{ padding: '6px 10px', fontSize: '13px', width: '160px' }}
                  value={renameClassNameText}
                  onChange={(e) => setRenameClassNameText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameClass()}
                  autoFocus
                />
                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '6px 10px', fontSize: '11px' }} onClick={handleSaveRenameClass}>Save</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => setIsRenamingClass(false)}>Cancel</button>
              </div>
            ) : (
              <select 
                className={styles.classSelect}
                value={activeClassId || ""}
                onChange={(e) => setActiveClass(e.target.value)}
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            )}
          </div>

          {activeClass && !isRenamingClass && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                className={styles.iconBtn} 
                title="Rename this classroom" 
                onClick={handleStartRenameClass}
              >
                <Edit2 size={13} />
              </button>
              <button 
                className={`${styles.iconBtn} ${styles.dangerBtn}`} 
                title="Delete this classroom" 
                onClick={() => handleDeleteClass(activeClass.id, activeClass.name)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowClassForm(!showClassForm)}>
            <Plus size={14} /> New Class
          </button>

          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowManageClassesModal(true)}>
            ⚙️ Manage All
          </button>
        </div>

        {activeClass && (
          <div className={styles.classBarRight}>
            <span className={styles.statusIndicator} style={{ color: '#00FFD5', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
              {presentCount} / {totalCount} PRESENT
            </span>
            <button className={`${styles.btn} ${styles.btnCyan}`} onClick={() => activeClass && markAllPresent(activeClass.id)}>
              ✓ Mark All Present
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowSheetsModal(true)}
              style={{ background: 'var(--green)', color: '#000', fontWeight: 700 }}
            >
              📊 Google Sheets Sync
            </button>
          </div>
        )}
      </div>

      {/* New Class Modal / Form inline */}
      {showClassForm && (
        <div className={styles.bulkModal} style={{ position: 'relative', margin: '12px 0' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              className={styles.rosterSearch}
              placeholder="Enter new class name (e.g. Class 10-A)..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
              autoFocus
            />
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddClass}>Create Class</button>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowClassForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!activeClass ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
          <p style={{ color: '#4a637d', fontSize: '14px' }}>No class selected. Create or select a class above to get started.</p>
        </div>
      ) : viewMode === 'prep' ? (

        /* MODE 1: QUICK PREP WORKSPACE */
        <div className={styles.splitWorkspace}>
          
          {/* LEFT PANEL: Class Roster & Attendance Checklist */}
          <div className={styles.leftChecklistPanel}>
            <div className={styles.panelTitle}>
              <span>CLASS CHECKLIST</span>
              <span className={styles.checklistMeta}>{filteredStudents.length} STUDENTS</span>
            </div>

            <input
              className={styles.rosterSearch}
              placeholder="Search student..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
              {filteredStudents.map((s) => {
                const present = isSelected(s.id);
                return (
                  <div key={s.id} className={styles.studentChecklistRow}>
                    <div className={styles.studentChecklistLeft}>
                      <img
                        src={(s.gender || 'male') === 'female' ? '/ui/avatars/AvatarGirl.png?v=v3' : '/ui/avatars/AvatarBoy.png?v=v3'}
                        alt={s.name}
                        className={styles.avatarSmall}
                        title="Click to toggle gender"
                        onClick={() => updateStudent(activeClass.id, s.id, { gender: s.gender === 'female' ? 'male' : 'female' })}
                      />
                      <div>
                        <div className={styles.checklistName}>{s.name}</div>
                        <div className={styles.checklistMeta}>{s.xp || 0} XP • {s.gender === 'female' ? 'Female' : 'Male'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className={`${styles.presenceToggleBtn} ${present ? styles.presentBadge : styles.absentBadge}`}
                        onClick={() => handleToggleAttendance(s.id)}
                      >
                        {present ? '✓ PRESENT' : '✕ ABSENT'}
                      </button>

                      <button
                        className={styles.iconBtn}
                        onClick={() => handleOpenEditStudent(s)}
                        title="Edit student profile"
                      >
                        <Edit2 size={12} />
                      </button>

                      <button
                        className={`${styles.iconBtn} ${styles.dangerBtn}`}
                        onClick={() => handleDeleteStudent(s.id, s.name)}
                        title="Delete student"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Quick Add Inline Input */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                ref={addStudentInputRef}
                className={styles.rosterSearch}
                placeholder="+ Add student name..."
                value={addStudentName}
                onChange={(e) => setAddStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddStudent}>
                <Plus size={14} /> Add
              </button>
            </div>

            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              style={{ width: '100%', fontSize: '11px', marginTop: '4px' }}
              onClick={() => setShowBulkAdd(true)}
            >
              <Upload size={12} /> Bulk Import Roster
            </button>
          </div>

          {/* RIGHT PANEL: Instant Team Generator & Squad Studio */}
          <div className={styles.rightStudioPanel}>
            <div className={styles.builderHeader}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'Syne', fontSize: '14px', fontWeight: 800, color: '#00FFD5', letterSpacing: '1px' }}>
                  LIVE SQUADS ({currentTeams.length})
                </div>

                {/* Strategy Pills */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '6px' }}>
                  <button
                    className={`${styles.modeToggleBtn} ${balanceStrategy === 'balanced' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => {
                      setBalanceStrategy('balanced');
                      generateTeams(activeClass.id, teamCount, presentStudentIds, 'balanced');
                    }}
                  >
                    ⚖️ Balanced
                  </button>
                  <button
                    className={`${styles.modeToggleBtn} ${balanceStrategy === 'mixed_energy' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => {
                      setBalanceStrategy('mixed_energy');
                      generateTeams(activeClass.id, teamCount, presentStudentIds, 'mixed_energy');
                    }}
                  >
                    ⚡ Energy
                  </button>
                  <button
                    className={`${styles.modeToggleBtn} ${balanceStrategy === 'gender_balanced' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => {
                      setBalanceStrategy('gender_balanced');
                      generateTeams(activeClass.id, teamCount, presentStudentIds, 'gender_balanced');
                    }}
                  >
                    👫 Gender
                  </button>
                  <button
                    className={`${styles.modeToggleBtn} ${balanceStrategy === 'random' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => {
                      setBalanceStrategy('random');
                      generateTeams(activeClass.id, teamCount, presentStudentIds, 'random');
                    }}
                  >
                    🎲 Random
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Teams:</span>
                  <select
                    className={styles.rosterSearch}
                    style={{ width: '90px', padding: '6px' }}
                    value={teamCount}
                    onChange={(e) => {
                      const n = parseInt(e.target.value);
                      setTeamCount(n);
                      generateTeams(activeClass.id, n, presentStudentIds, balanceStrategy);
                    }}
                  >
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n} Teams</option>
                    ))}
                  </select>
                </div>

                <button
                  className={`${styles.btn} ${styles.btnCyan}`}
                  onClick={() => generateTeams(activeClass.id, teamCount, presentStudentIds, balanceStrategy)}
                >
                  <Shuffle size={14} /> Re-roll
                </button>
              </div>
            </div>

            {/* Teams Grid */}
            <div className={styles.teamsGrid}>
              {currentTeams.map((team) => (
                <div key={team.id} className={styles.teamCard} style={{ borderTop: `3px solid ${team.color}`, background: `linear-gradient(180deg, ${team.color}12 0%, #111827 40%)` }}>
                  <div className={styles.teamHeader}>
                    <div className={styles.teamNameRow}>
                      <div className={styles.teamDot} style={{ background: team.color, boxShadow: `0 0 8px ${team.color}` }}></div>
                      <div className={styles.teamName} style={{ color: team.color }}>{team.name}</div>
                      <div className={styles.squadRating}>OSR {team.osr || 0}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#94a3b8' }}>
                        {team.students.length} Members
                      </span>
                    </div>
                  </div>

                  <div className={styles.teamMembers}>
                    {team.students.map((s) => (
                      <div key={s.id} className={styles.memberRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={(s.gender || 'male') === 'female' ? '/ui/avatars/AvatarGirl.png?v=v3' : '/ui/avatars/AvatarBoy.png?v=v3'}
                            alt=""
                            style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${team.color}`, objectFit: 'cover' }}
                          />
                          {(() => {
                            const r = getRankForXp(s.xp || 0);
                            return <RankIcon tier={r.tier} stars={r.stars} size={16} />;
                          })()}
                          <div className={styles.memberName}>{s.name}</div>
                          {s.role && (
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(0, 255, 213, 0.12)', border: '1px solid rgba(0, 255, 213, 0.3)', color: '#00FFD5', textTransform: 'uppercase' }}>
                              {s.role}
                            </span>
                          )}
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
              ))}
            </div>

            {/* Bench / Unassigned Holding Area */}
            {unassignedStudents.length > 0 && (
              <div className={styles.benchSection}>
                <div className={styles.benchHeader}>
                  <div className={styles.benchTitle}>[ HOLDING BENCH ]</div>
                  <div className={styles.benchSub}>{unassignedStudents.length} UNASSIGNED STUDENTS</div>
                </div>
                <div className={styles.benchGrid}>
                  {unassignedStudents.map((s) => (
                    <div key={s.id} className={styles.benchCard}>
                      <div className={styles.memberName}>{s.name}</div>
                      <button
                        className={styles.moveBtn}
                        onClick={() => setMovingStudentId(movingStudentId === s.id ? null : s.id)}
                      >
                        Assign ▾
                      </button>
                      {movingStudentId === s.id && (
                        <div className={styles.moveDropdown}>
                          {currentTeams.map((t) => (
                            <button
                              key={t.id}
                              className={styles.moveDropdownItem}
                              style={{ color: t.color }}
                              onClick={() => { moveStudentToTeam(s.id, t.id); setMovingStudentId(null); }}
                            >
                              → {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Action Bar: Start Gaming */}
            <div className={styles.startGamingBar}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                  SQUADS READY FOR ARENA
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Launch any game directly with these {currentTeams.length} balanced squads
                </div>
              </div>

              <button className={styles.startGamingBtn} onClick={() => setGameDrawerOpen(true)}>
                🚀 START GAME WITH THESE TEAMS
              </button>
            </div>

          </div>

        </div>

      ) : (

        /* MODE 2: OPERATIVE SHOWCASE VIEW (PROJECTOR MODE) */
        <div className={styles.showcaseContainer}>
          <div className={styles.showcaseHeader}>
            <div>
              <div className={styles.showcaseTitle}>CLASSROOM OPERATIVE SHOWCASE</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                PROJECTOR MODE // {activeClass.name}
              </div>
            </div>

            <button className={styles.spotlightBtn} onClick={handleSpotlightOperative}>
              <Sparkles size={16} /> 🔦 SPOTLIGHT OPERATIVE
            </button>
          </div>

          <div className={styles.showcaseGrid}>
            {activeClass.students.map((student) => {
              const present = isSelected(student.id);
              if (!present) return null; // Only showcase present students

              const rankInfo = getRankForXp(student.xp || 0);
              const progressInfo = getNextRankProgress(student.xp || 0);
              const studentTeam = currentTeams.find(t => t.students.some(st => st.id === student.id));
              const teamColor = studentTeam?.color || '#00FFD5';
              const teamGlow = teamColor + '33';
              const isSpotlighted = spotlightStudentId === student.id;

              return (
                <div
                  key={student.id}
                  className={`${styles.dossierCard} ${isSpotlighted ? styles.spotlightCard : ''}`}
                  style={{
                    '--team-color': teamColor,
                    '--team-glow': teamGlow
                  } as React.CSSProperties}
                >
                  <div className={styles.dossierHeader}>
                    <span className={styles.dossierSquadTag}>{studentTeam?.name || 'UNASSIGNED'}</span>
                    {student.role && (
                      <span className={styles.dossierRoleBadge}>{student.role}</span>
                    )}
                  </div>

                  <div className={styles.dossierBody}>
                    <div className={styles.dossierAvatarWrapper}>
                      <img
                        src={(student.gender || 'male') === 'female' ? '/ui/avatars/AvatarGirl.png?v=v3' : '/ui/avatars/AvatarBoy.png?v=v3'}
                        alt={student.name}
                        className={styles.dossierAvatarImg}
                      />
                    </div>

                    <div className={styles.dossierInfo}>
                      <div className={styles.dossierName}>{student.name}</div>
                      <div className={styles.dossierRankLabel}>
                        {rankInfo.label} • {"★".repeat(rankInfo.stars)}
                      </div>

                      <div className={styles.dossierXpTrack}>
                        <div className={styles.dossierXpFill} style={{ width: `${progressInfo.progressPercent}%` }} />
                      </div>
                    </div>

                    <RankIcon tier={rankInfo.tier} stars={rankInfo.stars} size={48} />
                  </div>

                  <div className={styles.dossierFooter}>
                    <span className={styles.dossierXpText}>
                      {(student.xp || 0).toLocaleString()} XP Total
                    </span>

                    <button
                      className={styles.awardXpBtn}
                      onClick={() => awardStudentXp(activeClass.id, student.id, 50, 'manual_award', 'showcase')}
                    >
                      +50 XP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      )}

      {/* Bulk Import Modal */}
      {showBulkAdd && (
        <div className={styles.bulkOverlay} onClick={() => setShowBulkAdd(false)}>
          <div className={styles.bulkModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bulkHeader}>
              <div className={styles.bulkTitle}>MASS ROSTER IMPORT</div>
              <button className={styles.bulkClose} onClick={() => setShowBulkAdd(false)}>✕</button>
            </div>
            <div className={styles.bulkBody}>
              <div className={styles.bulkInstructions}>
                Paste student names below (one per line). Optionally add <strong>(m)</strong> or <strong>(f)</strong> for gender.
              </div>
              <textarea
                className={styles.bulkTextareaModal}
                placeholder={"John (m)\nJane (f)\nAhmad\n..."}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                autoFocus
              />
              <div className={styles.bulkFooter}>
                <button className={styles.btnGhost} onClick={() => setShowBulkAdd(false)}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleBulkAdd} disabled={!bulkText.trim()}>
                  Import Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className={styles.modalOverlay} onClick={() => setEditingStudent(null)}>
          <div className={styles.modalContentCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Edit Student Profile
              </h3>
              <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }} onClick={() => setEditingStudent(null)}>✕</button>
            </div>

            <div className={styles.modalFormRow}>
              <span className={styles.modalLabel}>Student Name</span>
              <input
                className={styles.modalInput}
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.modalFormRow}>
                <span className={styles.modalLabel}>Gender Avatar</span>
                <select
                  className={styles.modalInput}
                  value={editStudentGender}
                  onChange={(e) => setEditStudentGender(e.target.value as any)}
                >
                  <option value="male">Male (AvatarBoy)</option>
                  <option value="female">Female (AvatarGirl)</option>
                </select>
              </div>

              <div className={styles.modalFormRow}>
                <span className={styles.modalLabel}>XP Points</span>
                <input
                  type="number"
                  className={styles.modalInput}
                  value={editStudentXp}
                  onChange={(e) => setEditStudentXp(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.modalFormRow}>
                <span className={styles.modalLabel}>Proficiency Level</span>
                <select
                  className={styles.modalInput}
                  value={editStudentLevel}
                  onChange={(e) => setEditStudentLevel(e.target.value as any)}
                >
                  <option value="Low">Low</option>
                  <option value="Mid">Mid</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className={styles.modalFormRow}>
                <span className={styles.modalLabel}>Classroom Energy</span>
                <select
                  className={styles.modalInput}
                  value={editStudentEnergy}
                  onChange={(e) => setEditStudentEnergy(e.target.value as any)}
                >
                  <option value="Passive">Passive</option>
                  <option value="Normal">Normal</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditingStudent(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSaveEditStudent}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Classrooms Modal */}
      {showManageClassesModal && (
        <div className={styles.modalOverlay} onClick={() => setShowManageClassesModal(false)}>
          <div className={styles.modalContentCard} style={{ width: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Manage All Classrooms ({classes.length})
              </h3>
              <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }} onClick={() => setShowManageClassesModal(false)}>✕</button>
            </div>

            <table className={styles.manageClassTable}>
              <thead>
                <tr>
                  <th>Classroom Name</th>
                  <th>Students</th>
                  <th>Total XP</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const classTotalXp = cls.students.reduce((sum, s) => sum + (s.xp || 0), 0);
                  return (
                    <tr key={cls.id}>
                      <td style={{ fontWeight: 700, color: '#00FFD5' }}>{cls.name}</td>
                      <td>{cls.students.length} Students</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{classTotalXp.toLocaleString()} XP</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className={`${styles.btn} ${styles.btnGhost}`}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => {
                              setActiveClass(cls.id);
                              setShowManageClassesModal(false);
                            }}
                          >
                            Select
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.dangerBtn}`}
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            title="Delete classroom"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowManageClassesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Game Selector Drawer */}
      <GameLauncherDrawer open={gameDrawerOpen} onClose={() => setGameDrawerOpen(false)} />

      {/* Google Sheets Sync Modal */}
      {showSheetsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSheetsModal(false)}>
          <div className={styles.modal} style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-bright)', margin: 0 }}>
                    Copy Attendance for Google Sheets
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {activeClass?.name} • {presentCount} / {totalCount} Present
                  </span>
                </div>
              </div>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowSheetsModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Copies student presence as vertical <strong>P</strong> (Present) or <strong>A</strong> (Absent) values in the <strong>exact original order</strong> your students were added to the system.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--green)', color: '#000' }}
                  onClick={handleCopyPAOnly}
                >
                  📋 Copy P / A Column (1-Click for Google Sheets)
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    className={`${styles.btn} ${styles.btnCyan}`}
                    style={{ padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleCopyNameAndPA}
                  >
                    📋 Copy Name + P/A (2 Columns)
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnGhost}`}
                    style={{ padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleDownloadCSV}
                  >
                    📥 Download CSV File
                  </button>
                </div>
              </div>

              {copyToast && (
                <div style={{ padding: '10px 14px', background: 'rgba(0, 232, 122, 0.15)', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>
                  ✓ Copied to clipboard! Select the first student's date cell in Google Sheets and press <strong>Ctrl + V</strong>.
                </div>
              )}

              {/* PREVIEW TABLE IN ORIGINAL ORDER */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Student Order Preview ({activeClass?.students.length || 0} Students)
                </span>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '8px' }}>
                  <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <th style={{ padding: '4px 8px', width: '36px' }}>#</th>
                        <th style={{ padding: '4px 8px' }}>Student Name (System Order)</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right' }}>P / A Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeClass?.students || []).map((s, idx) => {
                        const isPresent = presentStudentIds.includes(s.id);
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '4px 8px', color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>{idx + 1}</td>
                            <td style={{ padding: '4px 8px', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: isPresent ? 'var(--green)' : 'var(--pink)' }}>
                              {isPresent ? 'P' : 'A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowSheetsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
