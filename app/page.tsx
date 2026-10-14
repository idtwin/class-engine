"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { 
  LESSON_UNITS, 
  LessonUnit, 
  getCustomUnits, 
  saveCustomUnit, 
  deleteCustomUnit,
  getClassNotations,
  saveClassNotation
} from "./data/lessonUnits";
import { soundEngine } from "./utils/soundEngine";
import { useClassroomStore } from "./store/useClassroomStore";
import { 
  BookOpen, 
  Sparkles, 
  Upload, 
  Plus, 
  Play, 
  CheckCircle, 
  Volume2, 
  Trash2, 
  Edit3, 
  Target, 
  Calendar,
  Eye,
  EyeOff,
  PenTool,
  Save,
  MessageSquare
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { soundEnabled, activeClassId, classes, presentStudentIds } = useClassroomStore();
  const [mounted, setMounted] = useState(false);

  // Units state
  const [allUnits, setAllUnits] = useState<LessonUnit[]>(LESSON_UNITS);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("sma-11-conditionals");

  // Weekly Planner Matrix state
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [activeDay, setActiveDay] = useState<"Mon" | "Tue" | "Wed" | "Thu" | "Fri">("Mon");

  // Presentation Mode toggle (Default: false = Teacher Planning Mode)
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Per-class notation state
  const [classNote, setClassNote] = useState<string>("");

  // Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [importGrade, setImportGrade] = useState<"Grade 10" | "Grade 11" | "Grade 12">("Grade 11");

  useEffect(() => {
    setMounted(true);
    const custom = getCustomUnits();
    if (custom.length > 0) {
      setAllUnits([...custom, ...LESSON_UNITS]);
    }
  }, []);

  // Sync Class Notations when active class or unit changes
  useEffect(() => {
    if (activeClassId && selectedUnitId) {
      const notes = getClassNotations(activeClassId);
      setClassNote(notes[selectedUnitId] || "");
    }
  }, [activeClassId, selectedUnitId]);

  if (!mounted) return null;

  const currentUnit: LessonUnit =
    allUnits.find((u) => u.id === selectedUnitId) || allUnits[0] || LESSON_UNITS[0];

  const activeClass = classes.find((c) => c.id === activeClassId);
  const presentCount = activeClass ? activeClass.students.filter((s) => presentStudentIds.includes(s.id)).length : 0;

  // Auto-Save helper for inline editing of active unit
  const handleUpdateUnitField = (fieldPath: string, value: any) => {
    const updated = { ...currentUnit };

    if (fieldPath === "unitTitle") updated.unitTitle = value;
    else if (fieldPath === "grammarFocus") updated.grammarFocus = value;
    else if (fieldPath === "vocabularyTopic") updated.vocabularyTopic = value;
    else if (fieldPath === "word.word") {
      updated.wordOfTheWeek = { ...(updated.wordOfTheWeek || { pos: "noun", definition: "", example: "" }), word: value };
    } else if (fieldPath === "word.pos") {
      updated.wordOfTheWeek = { ...(updated.wordOfTheWeek || { word: "", definition: "", example: "" }), pos: value };
    } else if (fieldPath === "word.definition") {
      updated.wordOfTheWeek = { ...(updated.wordOfTheWeek || { word: "", pos: "noun", example: "" }), definition: value };
    } else if (fieldPath === "word.example") {
      updated.wordOfTheWeek = { ...(updated.wordOfTheWeek || { word: "", pos: "noun", definition: "" }), example: value };
    } else if (fieldPath === "phrase.phrase") {
      updated.phraseOfTheWeek = { ...(updated.phraseOfTheWeek || { meaning: "", example: "" }), phrase: value };
    } else if (fieldPath === "phrase.meaning") {
      updated.phraseOfTheWeek = { ...(updated.phraseOfTheWeek || { phrase: "", example: "" }), meaning: value };
    } else if (fieldPath === "phrase.example") {
      updated.phraseOfTheWeek = { ...(updated.phraseOfTheWeek || { phrase: "", meaning: "" }), example: value };
    }

    const updatedUnits = allUnits.map((u) => (u.id === updated.id ? updated : u));
    setAllUnits(updatedUnits);
    saveCustomUnit(updated);
  };

  const handleUpdateStepField = (stepIdx: number, field: "title" | "desc" | "promptTopic", value: string) => {
    const updatedSteps = [...currentUnit.steps];
    updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], [field]: value };
    const updatedUnit = { ...currentUnit, steps: updatedSteps };

    const updatedUnits = allUnits.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
    setAllUnits(updatedUnits);
    saveCustomUnit(updatedUnit);
  };

  const handleNotationChange = (text: string) => {
    setClassNote(text);
    if (activeClassId && selectedUnitId) {
      saveClassNotation(activeClassId, selectedUnitId, text);
    }
  };

  const handleLaunchStep = (gameId: string, topic?: string) => {
    soundEngine.playSuccess(soundEnabled);
    const promptTopic = topic || currentUnit.vocabularyTopic || currentUnit.unitTitle;
    router.push(`/${gameId}?topic=${encodeURIComponent(promptTopic)}`);
  };

  const handleImportParse = () => {
    if (!pastedText.trim()) return alert("Please paste lesson text or notes first!");

    const lines = pastedText.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = lines[0] || "Custom Lesson";
    const grammar = lines[1] || "Target Grammar Focus";
    const vocab = lines.slice(2, 6).join(", ") || "General Vocabulary";

    const newUnit: LessonUnit = {
      id: `custom-${Date.now()}`,
      grade: importGrade,
      unitTitle: title,
      grammarFocus: grammar,
      vocabularyTopic: vocab,
      cefrLevel: "B1",
      weekNumber: activeWeek,
      dayOfWeek: activeDay,
      wordOfTheWeek: {
        word: lines[2] || "Focus Word",
        pos: "noun",
        definition: "Key vocabulary item extracted from imported lesson plan.",
        example: `We are practicing ${lines[2] || "this word"} in today's lesson.`
      },
      phraseOfTheWeek: {
        phrase: lines[3] || "Key Expression",
        meaning: "Core idiom or communicative phrase for oral drills.",
        example: `Let's use "${lines[3] || "Key Expression"}" during our speaking challenge.`
      },
      targetVocabList: lines.slice(2, 8),
      agendaNotes: [
        "Warm-up speaking debate on lesson theme",
        "Target sentence unscramble and syntax repair",
        "Oral vocabulary Taboo sprint",
        "Final rapid buzzer review and exit check"
      ],
      steps: [
        {
          stepNumber: 1,
          phase: "Warm-Up",
          title: "Dilemma Warm-Up",
          gameId: "wyr",
          gameName: "Would You Rather",
          icon: "💬",
          desc: `Debate scenarios centered around ${title}.`,
          targetSkill: "Speaking Fluency",
          promptTopic: title
        },
        {
          stepNumber: 2,
          phase: "Vocab & Grammar",
          title: "Sentence Unscramble Drill",
          gameId: "word-surge",
          gameName: "Word Surge",
          icon: "⚡",
          desc: `Race to unscramble target ${grammar} structures.`,
          targetSkill: "Syntax & Grammar",
          promptTopic: grammar
        },
        {
          stepNumber: 3,
          phase: "Speaking Challenge",
          title: "Taboo Vocab Race",
          gameId: "hotseat",
          gameName: "The Hot Seat",
          icon: "🎯",
          desc: `Describe ${vocab} without using forbidden taboo words.`,
          targetSkill: "Oral Vocabulary Precision",
          promptTopic: vocab
        },
        {
          stepNumber: 4,
          phase: "Exit Review",
          title: "Buzzer Knowledge Check",
          gameId: "rapid-fire",
          gameName: "Rapid Fire",
          icon: "🔥",
          desc: "Rapid quiz to check lesson mastery before class ends.",
          targetSkill: "Live Assessment",
          promptTopic: title
        }
      ]
    };

    saveCustomUnit(newUnit);
    setAllUnits([newUnit, ...allUnits]);
    setSelectedUnitId(newUnit.id);
    setPastedText("");
    setShowImportModal(false);
    soundEngine.playSuccess(soundEnabled);
  };

  const handleDeleteCurrentCustomUnit = () => {
    if (!currentUnit.id.startsWith("custom-")) return;
    if (confirm(`Delete custom unit "${currentUnit.unitTitle}"?`)) {
      deleteCustomUnit(currentUnit.id);
      const remaining = allUnits.filter((u) => u.id !== currentUnit.id);
      setAllUnits(remaining);
      setSelectedUnitId(remaining[0]?.id || LESSON_UNITS[0].id);
    }
  };

  return (
    <div className={`${styles.hubContainer} ${isPresentationMode ? styles.presentationMode : styles.editorActive}`}>
      
      {/* ──────────────────────────────────────────────────────────────────────────
         CONTROL BAR 1: WEEKLY PLANNER MATRIX & PRESENTATION MODE TOGGLE
         ────────────────────────────────────────────────────────────────────────── */}
      <div className={styles.topMatrixBar}>
        
        {/* Week Selector Matrix */}
        <div className={styles.weekNavGroup}>
          <span className={styles.matrixLabel}>🗓️ SCHEDULE PLANNER:</span>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
            <button
              key={w}
              className={`${styles.weekPill} ${activeWeek === w ? styles.weekPillActive : ""}`}
              onClick={() => {
                soundEngine.playClick(soundEnabled);
                setActiveWeek(w);
              }}
            >
              W{w}
            </button>
          ))}
        </div>

        {/* Day Tabs */}
        <div className={styles.dayTabs}>
          {(["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((day) => (
            <button
              key={day}
              className={`${styles.dayTab} ${activeDay === day ? styles.dayTabActive : ""}`}
              onClick={() => {
                soundEngine.playClick(soundEnabled);
                setActiveDay(day);
              }}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Presentation Mode Toggle Button */}
        <button
          className={`${styles.presentationToggleBtn} ${isPresentationMode ? styles.presentationActive : ""}`}
          onClick={() => {
            soundEngine.playClick(soundEnabled);
            setIsPresentationMode(!isPresentationMode);
          }}
          title={isPresentationMode ? "Switch to Teacher Planning Mode" : "Switch to Projected Presentation Mode"}
        >
          {isPresentationMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPresentationMode ? "👁️ PRESENTATION MODE" : "✏️ TEACHER PLANNING MODE"}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
         SECTION 1: PROJECTED HERO HEADER & INLINE EDITABLE TITLE
         ────────────────────────────────────────────────────────────────────────── */}
      <div className={styles.projectedHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerBadges}>
              <span className={styles.gradeBadge}>📖 {currentUnit.grade} SMA</span>
              <span className={styles.cefrBadge}>CEFR {currentUnit.cefrLevel}</span>
              <span className={styles.gradeBadge} style={{ background: 'rgba(176,110,255,0.12)', borderColor: 'rgba(176,110,255,0.3)', color: '#b06eff' }}>
                Week {activeWeek} • {activeDay}
              </span>
              {activeClass && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#00FFD5', marginLeft: '8px' }}>
                  👥 {activeClass.name} • {presentCount} Present
                </span>
              )}
            </div>

            {/* Inline Editable Unit Title */}
            <input
              className={styles.inlineInput}
              style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'Syne, sans-serif' }}
              value={currentUnit.unitTitle}
              onChange={(e) => handleUpdateUnitField("unitTitle", e.target.value)}
              readOnly={isPresentationMode}
              placeholder="Enter Lesson Unit Title..."
            />

            {/* Inline Editable Focus Text */}
            <div className={styles.unitFocusText} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <strong>Grammar Focus:</strong>
              <input
                className={styles.inlineInput}
                style={{ fontSize: '13px', color: '#cbd5e1' }}
                value={currentUnit.grammarFocus}
                onChange={(e) => handleUpdateUnitField("grammarFocus", e.target.value)}
                readOnly={isPresentationMode}
                placeholder="Grammar Focus..."
              />
            </div>
          </div>

          {/* Unit Switcher & Custom Actions (Hidden in Presentation Mode) */}
          {!isPresentationMode && (
            <div className={styles.unitControls}>
              <select
                className={styles.unitSelect}
                value={selectedUnitId}
                onChange={(e) => {
                  soundEngine.playClick(soundEnabled);
                  setSelectedUnitId(e.target.value);
                }}
              >
                {allUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.grade}: {u.unitTitle} {u.id.startsWith("custom-") ? "⭐ (Custom)" : ""}
                  </option>
                ))}
              </select>

              <button
                className={`${styles.actionBtn} ${styles.btnPrimary}`}
                onClick={() => {
                  soundEngine.playClick(soundEnabled);
                  setShowImportModal(true);
                }}
              >
                <Upload size={13} /> Import Lesson Plan
              </button>

              {currentUnit.id.startsWith("custom-") && (
                <button
                  className={`${styles.actionBtn} ${styles.btnGhost}`}
                  style={{ color: '#ff4d8f', borderColor: 'rgba(255,77,143,0.3)' }}
                  onClick={handleDeleteCurrentCustomUnit}
                  title="Delete this custom lesson unit"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
         SECTION 2: SPOTLIGHT BOARD (Inline Editable Cards)
         ────────────────────────────────────────────────────────────────────────── */}
      <div className={styles.spotlightGrid}>
        
        {/* Card 1: Word of the Week (Inline Editable) */}
        <div className={styles.spotlightCard}>
          <div className={styles.spotlightHeader}>
            <span className={`${styles.spotlightBadge} ${styles.wordBadge}`}>
              📌 WORD OF THE WEEK
            </span>
            <Volume2 size={16} style={{ color: '#00FFD5', cursor: 'pointer' }} onClick={() => soundEngine.playClick(soundEnabled)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <input
              className={styles.inlineInput}
              style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'Syne, sans-serif' }}
              value={currentUnit.wordOfTheWeek?.word || ""}
              onChange={(e) => handleUpdateUnitField("word.word", e.target.value)}
              readOnly={isPresentationMode}
              placeholder="Word of the Week..."
            />
            <input
              className={styles.inlineInput}
              style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', width: '60px' }}
              value={currentUnit.wordOfTheWeek?.pos || ""}
              onChange={(e) => handleUpdateUnitField("word.pos", e.target.value)}
              readOnly={isPresentationMode}
              placeholder="pos..."
            />
          </div>

          <input
            className={styles.inlineInput}
            style={{ fontSize: '13px', color: '#cbd5e1' }}
            value={currentUnit.wordOfTheWeek?.definition || ""}
            onChange={(e) => handleUpdateUnitField("word.definition", e.target.value)}
            readOnly={isPresentationMode}
            placeholder="Word definition..."
          />

          <div className={styles.spotlightExample}>
            "<input
              className={styles.inlineInput}
              style={{ fontSize: '12px', color: '#00FFD5', fontStyle: 'italic' }}
              value={currentUnit.wordOfTheWeek?.example || ""}
              onChange={(e) => handleUpdateUnitField("word.example", e.target.value)}
              readOnly={isPresentationMode}
              placeholder="Example sentence..."
            />"
          </div>
        </div>

        {/* Card 2: Phrase of the Week (Inline Editable) */}
        <div className={styles.spotlightCard}>
          <div className={styles.spotlightHeader}>
            <span className={`${styles.spotlightBadge} ${styles.phraseBadge}`}>
              💬 PHRASE OF THE WEEK
            </span>
            <Sparkles size={16} style={{ color: '#ffc843' }} />
          </div>

          <input
            className={styles.inlineInput}
            style={{ fontSize: '20px', fontWeight: 800, color: '#ffc843', fontFamily: 'Syne, sans-serif' }}
            value={currentUnit.phraseOfTheWeek?.phrase || ""}
            onChange={(e) => handleUpdateUnitField("phrase.phrase", e.target.value)}
            readOnly={isPresentationMode}
            placeholder="Phrase of the Week..."
          />

          <input
            className={styles.inlineInput}
            style={{ fontSize: '13px', color: '#cbd5e1' }}
            value={currentUnit.phraseOfTheWeek?.meaning || ""}
            onChange={(e) => handleUpdateUnitField("phrase.meaning", e.target.value)}
            readOnly={isPresentationMode}
            placeholder="Phrase meaning..."
          />

          <div className={styles.spotlightExample} style={{ color: '#ffc843', borderColor: '#ffc843', background: 'rgba(255,200,67,0.05)' }}>
            "<input
              className={styles.inlineInput}
              style={{ fontSize: '12px', color: '#ffc843', fontStyle: 'italic' }}
              value={currentUnit.phraseOfTheWeek?.example || ""}
              onChange={(e) => handleUpdateUnitField("phrase.example", e.target.value)}
              readOnly={isPresentationMode}
              placeholder="Example dialogue..."
            />"
          </div>
        </div>

        {/* Card 3: Class Agenda Goals */}
        <div className={styles.spotlightCard}>
          <div className={styles.spotlightHeader}>
            <span className={`${styles.spotlightBadge} ${styles.agendaBadge}`}>
              🎯 CLASSROOM AGENDA
            </span>
            <Target size={16} style={{ color: '#b06eff' }} />
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(currentUnit.agendaNotes || [
              "Dilemma Warm-up Speaking Debate",
              "Target Grammar Syntax Unscramble Drill",
              "High-speed Taboo Vocabulary Sprint",
              "Exit Quiz & Team XP Distribution"
            ]).map((item, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                <span style={{ color: '#b06eff', fontWeight: 800 }}>▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
         SECTION 3: PER-CLASS LIVE JOURNAL & TEACHER REFLECTION PANEL
         ────────────────────────────────────────────────────────────────────────── */}
      {!isPresentationMode && (
        <div className={styles.notationsCard}>
          <div className={styles.notationsHeader}>
            <div className={styles.notationsTitle}>
              <MessageSquare size={16} /> Per-Class Live Journal & Reflection Notations
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#64748b' }}>
              Auto-saved for {activeClass?.name || "Active Class"}
            </span>
          </div>

          <textarea
            className={styles.notationTextarea}
            placeholder={`Log teacher observations for ${activeClass?.name || "this class"} (e.g. "XI-2 struggled with Type 3 conditionals on Step 2; re-drill next Tuesday")...`}
            value={classNote}
            onChange={(e) => handleNotationChange(e.target.value)}
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
         SECTION 4: 4-STEP LESSON TIMELINE & 1-CLICK GAME LAUNCHERS
         ────────────────────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              4-Step Lesson Game Sequence
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Click 🚀 Launch to pre-load your custom edited lesson prompts into the game engine
            </div>
          </div>
        </div>

        <div className={styles.stepGrid}>
          {currentUnit.steps.map((step, idx) => (
            <div key={step.stepNumber} className={styles.stepCard}>
              <div className={styles.stepCardHeader}>
                <span className={styles.phaseTag}>
                  Step {step.stepNumber} • {step.phase}
                </span>
                <span className={styles.stepIcon}>{step.icon}</span>
              </div>

              <div>
                <input
                  className={styles.inlineInput}
                  style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'Syne, sans-serif' }}
                  value={step.title}
                  onChange={(e) => handleUpdateStepField(idx, "title", e.target.value)}
                  readOnly={isPresentationMode}
                  placeholder="Step title..."
                />
                <div className={styles.targetSkillTag}>Target: {step.targetSkill} • {step.gameName}</div>
              </div>

              <textarea
                className={styles.inlineInput}
                style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, resize: 'none', height: '54px' }}
                value={step.desc}
                onChange={(e) => handleUpdateStepField(idx, "desc", e.target.value)}
                readOnly={isPresentationMode}
                placeholder="Step description..."
              />

              {!isPresentationMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#00c8f0' }}>Prompt:</span>
                  <input
                    className={styles.inlineInput}
                    style={{ fontSize: '11px', color: '#00c8f0', fontFamily: 'JetBrains Mono, monospace' }}
                    value={step.promptTopic || ""}
                    onChange={(e) => handleUpdateStepField(idx, "promptTopic", e.target.value)}
                    placeholder="Game prompt topic..."
                  />
                </div>
              )}

              <button
                className={styles.launchBtn}
                onClick={() => handleLaunchStep(step.gameId, step.promptTopic)}
              >
                🚀 LAUNCH {step.gameName.toUpperCase()}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
         MODAL: PASTE & IMPORT LESSON PLAN DRAWER
         ────────────────────────────────────────────────────────────────────────── */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Paste / Import Lesson Plan
              </h3>
              <button 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
                onClick={() => setShowImportModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Paste your lesson notes, textbook chapter summary, or external AI lesson plan. The engine will extract the title, target grammar, vocabulary, and build 4 game-ready steps.
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#00c8f0' }}>Target Grade:</span>
              <select
                className={styles.unitSelect}
                style={{ padding: '6px 12px' }}
                value={importGrade}
                onChange={(e) => setImportGrade(e.target.value as any)}
              >
                <option value="Grade 10">Grade 10 SMA</option>
                <option value="Grade 11">Grade 11 SMA</option>
                <option value="Grade 12">Grade 12 SMA</option>
              </select>
            </div>

            <textarea
              className={styles.importTextarea}
              placeholder="Paste lesson text or notes here...&#10;Line 1: Unit Title&#10;Line 2: Grammar Focus&#10;Line 3+: Key vocabulary & topics..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className={`${styles.actionBtn} ${styles.btnGhost}`} onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={handleImportParse}>
                ✨ Create & Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
