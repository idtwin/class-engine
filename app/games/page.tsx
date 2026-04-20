"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./games.module.css";
import BoardLibrary from "../components/BoardLibrary";
import { SavedBoard, useClassroomStore } from "../store/useClassroomStore";

// Game data aligned with brief
const GAMES_DATA = [
  { name: "Rapid Fire",     id: "rapid-fire",     icon: "⚡", desc: "Fast-paced buzzer game. AI pre-generates 15–20 questions routed by student level.", energy: "high", phone: true,  skill: "speaking",   iconBg: "rgba(0,200,240,0.12)", iconBorder: "1px solid rgba(0,200,240,0.25)" },
  { name: "Fix It",         id: "fix-it",         icon: "🟡", desc: "Find the single error in a broken sentence before other teams. Race and Auction modes.", energy: "mid",  phone: true,  skill: "vocabulary", iconBg: "rgba(255,200,67,0.12)", iconBorder: "1px solid rgba(255,200,67,0.25)" },
  { name: "Odd One Out",    id: "odd-one-out",    icon: "🔮", desc: "AI-powered word classification. Classic, Debate, and Elimination modes. Find the outlier!",              energy: "mid",  phone: true,  skill: "vocabulary", iconBg: "rgba(176,110,255,0.12)", iconBorder: "1px solid rgba(176,110,255,0.25)" },
  { name: "Jeopardy",       id: "jeopardy",       icon: "⊞", desc: "The classic 5×5 board. AI dynamically generates categories and high-context visual aids.",                energy: "mid",  phone: true,  skill: "reading",    iconBg: "rgba(0,232,122,0.12)", iconBorder: "1px solid rgba(0,232,122,0.25)" },
  { name: "The Hot Seat",   id: "hotseat",        icon: "🔥", desc: "Fast-paced Taboo. Describe the hidden word to the student facing away from the projector.",              energy: "high", phone: false, skill: "speaking",   iconBg: "rgba(255,125,59,0.12)", iconBorder: "1px solid rgba(255,125,59,0.25)" },
  { name: "Picture Reveal", id: "reveal",         icon: "🖼️",  desc: "Answer rapid-fire questions to reveal a hidden AI-generated image tile by tile.",                        energy: "high", phone: true,  skill: "reading",    iconBg: "rgba(0,200,240,0.12)", iconBorder: "1px solid rgba(0,200,240,0.25)" },
  { name: "Would You Rather",id:"wyr",            icon: "💬", desc: "AI split-screen debate generator forcing students to argue bizarre scenarios.",                           energy: "mid",  phone: true,  skill: "writing",    iconBg: "rgba(255,77,143,0.12)", iconBorder: "1px solid rgba(255,77,143,0.25)" },
  { name: "Story Chain",    id: "story",          icon: "📖", desc: "Improv rules! Chain the story blocks using AI-forced keywords before the timer ends.",                   energy: "low",  phone: false, skill: "writing",    iconBg: "rgba(0,232,122,0.12)", iconBorder: "1px solid rgba(0,232,122,0.25)" },
  { name: "Chain Reaction", id: "chain-reaction", icon: "🔗", desc: "Compound word chains or last-letter races. Letter hints reveal on wrong answers.",                       energy: "high", phone: false, skill: "vocabulary", iconBg: "rgba(0,232,122,0.12)", iconBorder: "1px solid rgba(0,232,122,0.25)" },
];

const classHistory: Record<string, any> = {
  'global': { when: '2 days ago', className: 'XI – I', score: 1840, accuracy: 74, delta: '+8%', deltaDir: 'up' },
  'XI-I':   { when: '2 days ago', className: 'XI – I', score: 1840, accuracy: 74, delta: '+8%', deltaDir: 'up' },
  'XI-II':  { when: '4 days ago', className: 'XI – II', score: 1220, accuracy: 58, delta: '-4%', deltaDir: 'down' },
  'XI-III': { when: 'yesterday',  className: 'XI – III', score: 2100, accuracy: 81, delta: '+12%', deltaDir: 'up' },
};

export default function GamesHub() {
  const {
    llmProvider, setLlmProvider,
    geminiKey, setGeminiKey,
    mistralKey, setMistralKey,
    groqKey, setGroqKey,
    geminiModel, setGeminiModel,
    mistralModel, setMistralModel,
    groqModel, setGroqModel,
    seedDemoData, purgeDemoData,
    classes, activeClassId, setActiveClass,
    playMode, setPlayMode,
  } = useClassroomStore();

  const activeKeyLabel = llmProvider === "gemini" ? "Gemini API Key"
    : llmProvider === "groq" ? "Groq API Key"
    : "Mistral API Key";
  const activeKeyValue = llmProvider === "gemini" ? geminiKey
    : llmProvider === "groq" ? groqKey
    : mistralKey;
  const activeKeySetter = llmProvider === "gemini" ? setGeminiKey
    : llmProvider === "groq" ? setGroqKey
    : setMistralKey;

  const activeModel = llmProvider === "gemini" ? geminiModel
    : llmProvider === "groq" ? groqModel
    : mistralModel;
  const setActiveModel = llmProvider === "gemini" ? setGeminiModel
    : llmProvider === "groq" ? setGroqModel
    : setMistralModel;

  const [mounted, setMounted] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [filter, setFilter] = useState("all");
  const [libOpen, setLibOpen] = useState(false);
  const [featIdx, setFeatIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const router = useRouter();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleLaunch = (href: string) => {
    setIsLaunching(true);
    setTimeout(() => { router.push(href); }, 400);
  };

  const activeClass = classes.find(c => c.id === activeClassId);
  const featuredHistory = classHistory[activeClass?.name ?? 'global'] ?? classHistory['global'];
  const featuredGame = GAMES_DATA[featIdx];
  
  const barColor = featuredHistory.accuracy >= 70 ? 'var(--green)' : featuredHistory.accuracy >= 50 ? 'var(--yellow)' : 'var(--pink)';
  const valClass = featuredHistory.accuracy >= 70 ? styles.good : featuredHistory.accuracy >= 50 ? styles.mid : styles.low;

  const visibleGames = GAMES_DATA.filter(g => {
    if (filter === "all") return true;
    if (filter === "phone") return g.phone;
    return g.skill === filter;
  });

  return (
    <div className={`${styles.page} ${isLaunching ? styles.launching : ''}`}>
      {isLaunching && <div className={styles.launchingOverlay} />}

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>SYSTEM_ONLINE // <span>MISSION_SELECT</span></div>
          <h1>TACTICAL OPERATIONS</h1>
        </div>
        <div className={styles.headerActions}>
           <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setLibOpen(true)}>
             ⊞ Library
           </button>
           <BoardLibrary triggerOpen={libOpen} onClose={() => setLibOpen(false)} onLoadBoard={(b) => handleLaunch(`/${b.gameType}`)} hideTriggerButton={true} />
           <div className={styles.modeToggle}>
             <button
               className={`${styles.modeToggleBtn} ${playMode === 'projector' ? styles.modeToggleBtnActive : ''}`}
               onClick={() => setPlayMode('projector')}
               title="Projector / Teacher view"
             >
               📺 Projector
             </button>
             <button
               className={`${styles.modeToggleBtn} ${playMode === 'phone' ? styles.modeToggleBtnActive : ''}`}
               onClick={() => setPlayMode('phone')}
               title="Phone / Student view"
             >
               📱 Phone
             </button>
           </div>
           <button className={`${styles.btn} ${styles.btnPurple}`} onClick={() => setShowSettings(true)}>⚙ Settings</button>
        </div>
      </div>

      <div className={styles.featuredWrapper}>
        <div className={styles.featuredLabel}>⏱ Last Played</div>

        <div className={styles.classChipRow}>
          <span className={styles.classChipLabel}>Class:</span>
          <button
            className={`${styles.classChip} ${activeClassId === null ? styles.active : ''}`}
            onClick={() => setActiveClass(null)}
          >
            🌐 All Classes
          </button>
          {classes.map(cls => (
            <button
              key={cls.id}
              className={`${styles.classChip} ${activeClassId === cls.id ? styles.active : ''}`}
              onClick={() => setActiveClass(cls.id)}
            >
              {cls.name}
            </button>
          ))}
          <a href="/teams" className={`${styles.classChip} ${styles.classChipManage}`}>
            + Manage
          </a>
        </div>

        <div className={styles.featuredCard} onClick={() => handleLaunch(`/${featuredGame.id}`)}>
          <div style={{ flex: 1 }}>
            <div className={styles.featuredMeta}>
              <div className={styles.featuredIcon}>{featuredGame.icon}</div>
              <div>
                <div className={styles.featuredName}>{featuredGame.name}</div>
                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                  Last played <strong style={{ color: 'var(--text)' }}>{featuredHistory.when}</strong> · {featuredHistory.className}
                </div>
              </div>
            </div>
            <p className={styles.featuredDesc}>{featuredGame.desc}</p>
            <div className={styles.featuredTags}>
              <span className={`${styles.tag} ${featuredGame.energy === 'high' ? styles.tagEnergyHigh : (featuredGame.energy === 'mid' ? styles.tagEnergyMid : styles.tagEnergyLow)}`}>
                {featuredGame.energy === 'high' ? '🔥 High Energy' : (featuredGame.energy === 'mid' ? '⚡ Mid Energy' : '💧 Low Energy')}
              </span>
              {featuredGame.phone && <span className={`${styles.tag} ${styles.tagPhone}`}>📱 Phone Active</span>}
              <span className={`${styles.tag} ${styles.tagSkill}`} style={{ backgroundColor: featuredGame.iconBg }}>{featuredGame.skill}</span>
            </div>

            <div className={styles.sessionStats}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Score</div>
                <div className={`${styles.statValue} ${valClass}`}>{featuredHistory.score.toLocaleString()}</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Accuracy</div>
                <div className={`${styles.statValue} ${valClass}`}>{featuredHistory.accuracy}%</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBarWrap}>
                <div className={styles.statBarLabel}>Performance</div>
                <div className={styles.statBarTrack}>
                  <div className={styles.statBarFill} style={{ width: `${featuredHistory.accuracy}%`, background: barColor }}></div>
                </div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>vs. Last</div>
                <div className={styles.statValue} style={{ color: featuredHistory.deltaDir === 'up' ? 'var(--green)' : 'var(--pink)' }}>
                  {featuredHistory.deltaDir === 'up' ? '↑' : '↓'} {featuredHistory.delta}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.featuredLaunch}>
            <button className={styles.launchBtn} onClick={(e) => { e.stopPropagation(); handleLaunch(`/${featuredGame.id}`); }}>
              <div className={styles.launchBtnIcon}>▶</div>
              <div className={styles.launchBtnText}>Launch</div>
            </button>
            <button className={styles.reroll} onClick={(e) => { e.stopPropagation(); setFeatIdx((featIdx + 1) % GAMES_DATA.length); }}>↻ Cycle</button>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        {['all', 'vocabulary', 'reading', 'writing', 'speaking', 'phone'].map(f => (
          <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
            {f === 'phone' ? '📱 Phone Active' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.categories}>
        {['vocabulary', 'reading', 'writing', 'speaking'].map(skill => {
          const catGames = visibleGames.filter(g => g.skill === skill);
          if (catGames.length === 0) return null;
          
          const icon = skill === 'vocabulary' ? '🔤' : skill === 'reading' ? '📖' : skill === 'writing' ? '✍️' : '🎙️';
          const catClass = skill === 'vocabulary' ? styles.catVocab : skill === 'reading' ? styles.catReading : skill === 'writing' ? styles.catWriting : styles.catSpeaking;
          const textClass = skill === 'vocabulary' ? styles.catVocabText : skill === 'reading' ? styles.catReadingText : skill === 'writing' ? styles.catWritingText : styles.catSpeakingText;

          return (
            <div key={skill} className={styles.categoryBlock}>
              <div className={styles.categoryHeader}>
                <div className={`${styles.categoryIcon} ${catClass}`}>{icon}</div>
                <div className={`${styles.categoryTitle} ${textClass}`}>{skill} <span className={styles.categoryCount}>· {catGames.length}</span></div>
                <div className={styles.categoryLine}></div>
              </div>
              <div className={styles.gamesGrid}>
                {catGames.map(g => (
                  <div key={g.id} className={styles.gameCard} onClick={() => handleLaunch(`/${g.id}`)}>
                    <div className={styles.gameCardIcon} style={{ background: g.iconBg, border: g.iconBorder }}>{g.icon}</div>
                    <div>
                      <div className={styles.gameCardName}>{g.name}</div>
                      <div className={styles.gameCardDesc}>{g.desc}</div>
                    </div>
                    <div className={styles.gameCardFooter}>
                      <div className={styles.gameCardTags}>
                        <span className={`${styles.tag} ${g.energy === 'high' ? styles.tagEnergyHigh : (g.energy === 'mid' ? styles.tagEnergyMid : styles.tagEnergyLow)}`}>{g.energy}</span>
                        {g.phone && <span className={`${styles.tag} ${styles.tagPhone}`}>📱</span>}
                      </div>
                      <div className={styles.initLabel}>Launch →</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", marginBottom: "24px", color: "var(--purple)" }}>Settings</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  style={{ width: "100%", padding: "10px 16px", border: "none", borderRadius: "8px", background: "var(--green)", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
                  onClick={() => { seedDemoData(); setShowSettings(false); }}>
                  Load Sample Data
                </button>
                <button
                  style={{ width: "100%", padding: "10px 16px", border: "1px solid var(--pink)", borderRadius: "8px", background: "rgba(255,77,143,0.1)", color: "var(--pink)", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
                  onClick={() => { purgeDemoData(); setShowSettings(false); }}>
                  Clear All Data
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>AI Provider</label>
                <select
                  style={{ width: "100%", fontSize: "14px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "8px", padding: "8px 12px" }}
                  value={llmProvider}
                  onChange={e => setLlmProvider(e.target.value as any)}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="mistral">Mistral</option>
                  <option value="groq">Groq</option>
                  <option value="lmstudio">LM Studio (Local)</option>
                </select>
              </div>

              {llmProvider !== "lmstudio" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Model Name</label>
                    <input
                      type="text"
                      style={{ width: "100%", fontSize: "14px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "8px", padding: "8px 12px", boxSizing: "border-box" }}
                      value={activeModel}
                      onChange={e => setActiveModel(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{activeKeyLabel}</label>
                    <input
                      type="password"
                      style={{ width: "100%", fontSize: "14px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "8px", padding: "8px 12px", boxSizing: "border-box" }}
                      placeholder={llmProvider === "gemini" ? "AIza..." : llmProvider === "groq" ? "gsk_..." : "your-api-key..."}
                      value={activeKeyValue}
                      onChange={e => activeKeySetter(e.target.value)}
                    />
                  </div>
                </>
              )}

              {llmProvider === "lmstudio" && (
                <div style={{ fontSize: "12px", color: "var(--muted)", padding: "12px", background: "rgba(0,232,122,0.06)", border: "1px solid rgba(0,232,122,0.15)", borderRadius: "8px" }}>
                  LM Studio runs locally — no API key needed. Make sure the server is running on <strong style={{ color: "var(--green)" }}>port 1234</strong>.
                </div>
              )}
            </div>

            <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{ padding: "8px 24px", border: "1px solid var(--border2)", borderRadius: "8px", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "14px" }}
                onClick={() => setShowSettings(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
