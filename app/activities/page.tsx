"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { soundEngine } from "../utils/soundEngine";
import { useClassroomStore } from "../store/useClassroomStore";

const PEDAGOGICAL_CATEGORIES = [
  {
    categoryTitle: "🗣️ Oral Fluency & Speaking Challenges",
    objective: "Encourage spontaneous speaking, formal debate, and rapid vocabulary description.",
    activities: [
      {
        id: "hotseat",
        name: "The Hot Seat",
        icon: "🎯",
        desc: "Fast-paced Taboo. Students describe target vocabulary to a teammate without using forbidden words.",
        energy: "High Energy",
        recommendedGroup: "Teams of 4–6",
      },
      {
        id: "wyr",
        name: "Would You Rather",
        icon: "💬",
        desc: "Hypothetical dilemma generator forcing students to justify opinions using target conditionals.",
        energy: "Medium Energy",
        recommendedGroup: "Pairs or Whole Class",
      },
      {
        id: "story",
        name: "Story Chain",
        icon: "📖",
        desc: "Creative improv. Students build a continuous narrative using forced target vocabulary words.",
        energy: "Low Energy",
        recommendedGroup: "Group Chain",
      },
    ],
  },
  {
    categoryTitle: "🔤 Vocabulary & Spelling Precision",
    objective: "Master word collocations, compound noun chains, and rapid sentence unscrambles.",
    activities: [
      {
        id: "word-surge",
        name: "Word Surge",
        icon: "⚡",
        desc: "Race to unscramble complex sentence structures and target vocabulary under pressure.",
        energy: "High Energy",
        recommendedGroup: "Teams / Phone Remotes",
      },
      {
        id: "chain-reaction",
        name: "Chain Reaction",
        icon: "🔗",
        desc: "Build compound word chains or last-letter word sprints before time runs out.",
        energy: "High Energy",
        recommendedGroup: "Buzzer Teams",
      },
      {
        id: "cargo-hunt",
        name: "Cargo Hunt",
        icon: "📦",
        desc: "Concrete object hunt for A1-A2 learners using phone camera remotes.",
        energy: "High Energy",
        recommendedGroup: "Mobile Pairs",
      },
    ],
  },
  {
    categoryTitle: "🧩 Grammar & Syntax Repair",
    objective: "Identify common grammatical errors, classify word outliers, and review structured units.",
    activities: [
      {
        id: "fix-it",
        name: "Fix It",
        icon: "🟡",
        desc: "Error auction & repair race. Students spot the single syntax error in broken sentences.",
        energy: "Medium Energy",
        recommendedGroup: "Buzzer Teams",
      },
      {
        id: "odd-one-out",
        name: "Odd One Out",
        icon: "🔮",
        desc: "Word classification challenge. Students find the semantic outlier and defend their logic.",
        energy: "Medium Energy",
        recommendedGroup: "Pair Debates",
      },
      {
        id: "jeopardy",
        name: "Cyber Jeopardy",
        icon: "⊞",
        desc: "Classic 5x5 review matrix covering 5 grammar/vocab categories with wager slides.",
        energy: "Medium Energy",
        recommendedGroup: "Class Teams",
      },
    ],
  },
  {
    categoryTitle: "⚡ Quick Warm-Ups & Exit Tickets",
    objective: "5-minute lesson openers, rapid-fire exit quizzes, and visual comprehension check.",
    activities: [
      {
        id: "category-sprint",
        name: "Category Sprint (Name 3–5!)",
        icon: "⚡",
        desc: "Big text warm-up challenge. Students race to name 3–5 items in a given category (e.g. 3 Animals, 3 Oceans).",
        energy: "High Energy",
        recommendedGroup: "Pairs / Teams",
      },
      {
        id: "rapid-fire",
        name: "Rapid Fire Quiz",
        icon: "🔥",
        desc: "15-question fast-paced buzzer quiz tailored to lesson grammar targets.",
        energy: "High Energy",
        recommendedGroup: "Buzzer Teams",
      },
      {
        id: "reveal",
        name: "Picture Reveal",
        icon: "🖼️",
        desc: "Answer rapid target questions to unmask hidden visual prompts tile by tile.",
        energy: "High Energy",
        recommendedGroup: "Whole Class",
      },
    ],
  },
];

const SMA_CURRICULUM_PRESETS = [
  { id: 'analytical-exposition', title: 'Analytical Exposition Text', grade: 'Grade 11', category: 'Writing & Argumentation', topic: 'The Importance of Renewable Energy in Indonesia', description: 'Thesis statements, causal conjunctions (therefore, consequently), and persuasive vocabulary.' },
  { id: 'recount-text', title: 'Historical Recount Text', grade: 'Grade 10', category: 'Grammar & Past Tense', topic: 'Indonesian Independence Day Proclamation', description: 'Simple Past Tense, action verbs, chronological connectors (first, afterwards, finally).' },
  { id: 'narrative-legend', title: 'Indonesian Legends & Folklore', grade: 'Grade 10', category: 'Reading & Vocabulary', topic: 'The Legend of Malin Kundang & Sangkuriang', description: 'Direct vs indirect speech, narrative adjectives, moral lesson idioms.' },
  { id: 'procedure-text', title: 'Procedure & Digital Tutorials', grade: 'Grade 12', category: 'Technical English', topic: 'How to Build an AI Assistant Interface', description: 'Imperative verbs, step-by-step sequencers, technical jargon.' },
  { id: 'discussion-text', title: 'Discussion & Debate Topics', grade: 'Grade 12', category: 'Fluency & Contrast', topic: 'Social Media Impact on High School Mental Health', description: 'Contrastive conjunctions (however, on the other hand), balanced arguments.' },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const {
    soundEnabled,
    playMode,
    setPlayMode,
    llmProvider,
    setLlmProvider,
    geminiKey,
    setGeminiKey,
    mistralKey,
    setMistralKey,
    groqKey,
    setGroqKey,
    geminiModel,
    setGeminiModel,
    mistralModel,
    setMistralModel,
    groqModel,
    setGroqModel,
    savedBoards,
    deleteBoard,
    seedDemoData,
    purgeDemoData,
  } = useClassroomStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const activeKeyLabel =
    llmProvider === "gemini"
      ? "Gemini API Key"
      : llmProvider === "groq"
        ? "Groq API Key"
        : llmProvider === "mistral"
          ? "Mistral API Key"
          : "API Key";

  const activeKeyValue =
    llmProvider === "gemini"
      ? geminiKey
      : llmProvider === "groq"
        ? groqKey
        : mistralKey;

  const activeKeySetter =
    llmProvider === "gemini"
      ? setGeminiKey
      : llmProvider === "groq"
        ? setGroqKey
        : setMistralKey;

  const activeModel =
    llmProvider === "gemini"
      ? geminiModel
      : llmProvider === "groq"
        ? groqModel
        : mistralModel;

  const setActiveModel = (m: string) => {
    if (llmProvider === "gemini") setGeminiModel(m);
    else if (llmProvider === "groq") setGroqModel(m);
    else setMistralModel(m);
  };

  const handleLaunch = (id: string) => {
    soundEngine.playSuccess(soundEnabled);
    router.push(`/${id}`);
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* MAIN STUDIO HEADER & TOOLBAR */}
      <div className="studio-card" style={{ padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <span className="studio-badge" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--indigo)", border: "1px solid rgba(79, 70, 229, 0.2)", marginBottom: "8px" }}>
            🧩 Pedagogical Activity Studio
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-bright)", margin: 0, letterSpacing: "-0.01em" }}>
            Teaching Activities & Game Engine
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: "6px 0 0" }}>
            Select any interactive activity or launch custom AI-powered games
          </p>
        </div>

        {/* CONTROLS & SEARCH TOOLBAR */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* SEARCH BAR */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--surface-lifted)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: "12px", minWidth: "260px" }}>
            <span style={{ fontSize: "14px", color: "var(--muted)" }}>🔍</span>
            <input
              type="text"
              placeholder="Search by goal or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--text-bright)", fontSize: "13px", fontWeight: 500, outline: "none", width: "100%" }}
            />
          </div>

          {/* SMA PRESETS BUTTON */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              setShowPresets(true);
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
            style={{ padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📚 SMA Presets
          </button>

          {/* MODE TOGGLE */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              setPlayMode(playMode === "phone" ? "projector" : "phone");
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
            style={{ padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
            title="Toggle default view mode"
          >
            {playMode === "phone" ? "📱 Phone Mode" : "📺 Projector Mode"}
          </button>

          {/* AI SETTINGS BUTTON */}
          <button
            className="btn btn-primary"
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              setShowSettings(true);
            }}
            onMouseEnter={() => soundEngine.playHover(soundEnabled)}
            style={{ padding: "10px 18px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            ⚙️ AI Settings
          </button>
        </div>
      </div>

      {/* SAVED BOARDS SECTION (IF ANY EXIST) */}
      {savedBoards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                💾 Saved Custom Game Sets ({savedBoards.length})
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                Replay your saved custom Jeopardy matrices and AI generated boards
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {savedBoards.map((board) => (
              <div
                key={board.id}
                className="studio-card"
                style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", borderLeft: "4px solid var(--indigo)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-bright)", margin: 0 }}>
                      {board.title}
                    </h3>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {new Date(board.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBoard(board.id);
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--pink)", cursor: "pointer", fontSize: "14px" }}
                    title="Delete saved set"
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                    onClick={() => handleLaunch("jeopardy")}
                  >
                    Load Board →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIZED ACTIVITIES */}
      <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
        {PEDAGOGICAL_CATEGORIES.map((cat) => {
          const filtered = cat.activities.filter(
            (a) =>
              a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cat.categoryTitle.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filtered.length === 0) return null;

          return (
            <div key={cat.categoryTitle} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                  {cat.categoryTitle}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                  {cat.objective}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {filtered.map((activity) => (
                  <div
                    key={activity.id}
                    className="studio-card"
                    style={{
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      cursor: "pointer",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                    onClick={() => handleLaunch(activity.id)}
                    onMouseEnter={() => soundEngine.playHover(soundEnabled)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(79, 70, 229, 0.08)", border: "1px solid rgba(79, 70, 229, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                        {activity.icon}
                      </div>
                      <span className="studio-badge">
                        {activity.energy}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                        {activity.name}
                      </h3>
                      <p style={{ fontSize: "13px", color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
                        {activity.desc}
                      </p>
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
                        👥 {activity.recommendedGroup}
                      </span>
                      <button
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontSize: "12px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunch(activity.id);
                        }}
                      >
                        Launch Activity →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SMA PRESETS MODAL */}
      {showPresets && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowPresets(false)}
        >
          <div
            className="studio-card"
            style={{ width: "100%", maxWidth: "800px", padding: "32px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                  📚 SMA English Curriculum Presets (Grades 10–12)
                </h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Select a pre-built Indonesian curriculum lesson pack to launch Word Surge instantly
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => setShowPresets(false)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
              {SMA_CURRICULUM_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="studio-card"
                  style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                  onClick={() => {
                    setShowPresets(false);
                    handleLaunch(`word-surge?topic=${encodeURIComponent(preset.topic)}`);
                  }}
                  onMouseEnter={() => soundEngine.playHover(soundEnabled)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="studio-badge">{preset.grade}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{preset.category}</span>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-bright)", margin: 0 }}>
                    {preset.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                    {preset.description}
                  </p>
                  <div style={{ marginTop: "auto", paddingTop: "10px", fontSize: "12px", color: "var(--indigo)", fontWeight: 700 }}>
                    Launch Preset →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI SETTINGS MODAL */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            className="studio-card"
            style={{ width: "100%", maxWidth: "540px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                ⚙️ AI Provider & Studio Settings
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                Configure the LLM engine for generating interactive classroom games
              </p>
            </div>

            {/* DEMO DATA BUTTONS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                className="btn btn-secondary"
                style={{ padding: "10px", fontSize: "12px", fontWeight: 700 }}
                onClick={() => {
                  seedDemoData();
                  setShowSettings(false);
                }}
              >
                📥 Load Sample Data
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: "10px", fontSize: "12px", fontWeight: 700, color: "var(--pink)", borderColor: "rgba(255, 77, 143, 0.3)" }}
                onClick={() => {
                  purgeDemoData();
                  setShowSettings(false);
                }}
              >
                🗑️ Clear All Data
              </button>
            </div>

            {/* PROVIDER SELECTOR */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                AI Provider
              </label>
              <select
                style={{
                  width: "100%",
                  fontSize: "14px",
                  background: "var(--surface-lifted)",
                  border: "1px solid var(--border)",
                  color: "var(--text-bright)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  outline: "none",
                }}
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as any)}
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="groq">Groq (Ultra Fast)</option>
                <option value="mistral">Mistral AI</option>
                <option value="lmstudio">LM Studio (Local Host)</option>
              </select>
            </div>

            {/* MODEL & API KEY FIELDS */}
            {llmProvider !== "lmstudio" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Model Name
                  </label>
                  <input
                    type="text"
                    style={{
                      width: "100%",
                      fontSize: "14px",
                      background: "var(--surface-lifted)",
                      border: "1px solid var(--border)",
                      color: "var(--text-bright)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    {activeKeyLabel}
                  </label>
                  <input
                    type="password"
                    style={{
                      width: "100%",
                      fontSize: "14px",
                      background: "var(--surface-lifted)",
                      border: "1px solid var(--border)",
                      color: "var(--text-bright)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    placeholder={
                      llmProvider === "gemini"
                        ? "AIza..."
                        : llmProvider === "groq"
                          ? "gsk_..."
                          : "your-api-key..."
                    }
                    value={activeKeyValue}
                    onChange={(e) => activeKeySetter(e.target.value)}
                  />
                </div>
              </>
            )}

            {llmProvider === "lmstudio" && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-bright)",
                  padding: "14px",
                  background: "rgba(0, 232, 122, 0.08)",
                  border: "1px solid rgba(0, 232, 122, 0.2)",
                  borderRadius: "10px",
                }}
              >
                LM Studio runs locally — no API key needed. Ensure LM Studio server is active on <strong>http://localhost:1234</strong>.
              </div>
            )}

            {/* CLOSE BUTTON */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "10px 24px", fontSize: "13px" }}
                onClick={() => setShowSettings(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
