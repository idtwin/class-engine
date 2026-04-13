"use client";

import { useClassroomStore, Student, Level, Energy } from "../store/useClassroomStore";
import styles from "./dashboard.module.css";
import { Users, Zap, Brain, Settings, FolderPlus, ArrowLeft } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { classes, activeClassId, setActiveClass, addClass, removeClass, addStudent, removeStudent, updateStudent, updateClass, updateClassCategory, bulkAddStudents, folders, addFolder, removeFolder } = useClassroomStore();
  
  const [newStudentName, setNewStudentName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassCategory, setNewClassCategory] = useState("General");
  const [newFolderName, setNewFolderName] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);

  const activeClass = classes.find(c => c.id === activeClassId);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const { geminiKey, setGeminiKey, llmProvider, setLlmProvider, mistralKey, setMistralKey, mistralModel, setMistralModel, playMode, setPlayMode } = useClassroomStore();

  const insights = useMemo(() => {
    if (!activeClass || activeClass.students.length === 0) return { predominantLevel: "Unknown", predominantEnergy: "Unknown", suggestion: "Add students to see insights." };
    
    const levels = { Low: 0, Mid: 0, High: 0 };
    const energies = { Passive: 0, Normal: 0, Active: 0 };
    
    activeClass.students.forEach(s => {
      levels[s.level]++;
      energies[s.energy]++;
    });

    const predominantLevel = (Object.keys(levels) as Level[]).reduce((a, b) => levels[a] > levels[b] ? a : b);
    const predominantEnergy = (Object.keys(energies) as Energy[]).reduce((a, b) => energies[a] > energies[b] ? a : b);

    let suggestion = "Balanced class. Standard games work well.";
    if (predominantLevel === "Low" && predominantEnergy === "Passive") suggestion = "Low energy and level. Use very easy, highly interactive icebreakers.";
    if (predominantLevel === "High" && predominantEnergy === "Active") suggestion = "High energy and level! Use fast-paced, challenging debates.";
    if (predominantLevel === "Low" && predominantEnergy === "Active") suggestion = "High energy but low level. Use simple vocabulary but fast physical games.";

    return { predominantLevel, predominantEnergy, suggestion };
  }, [activeClass]);

  if (!mounted) return null;

  const settingsModal = settingsOpen && (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2 style={{ color: 'var(--accent)' }}>System Settings</h2>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>

          {/* ── Play Mode Toggle ── */}
          <div>
            <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.75rem' }}>Play Mode</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setPlayMode('projector')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '12px', border: '2px solid',
                  borderColor: playMode === 'projector' ? '#2dd4bf' : 'rgba(255,255,255,0.15)',
                  background: playMode === 'projector' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem',
                  transition: 'all 0.2s'
                }}
              >
                📺 Projector <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>No phones needed</span>
              </button>
              <button
                onClick={() => setPlayMode('phone')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '12px', border: '2px solid',
                  borderColor: playMode === 'phone' ? '#4d9fff' : 'rgba(255,255,255,0.15)',
                  background: playMode === 'phone' ? 'rgba(77,159,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem',
                  transition: 'all 0.2s'
                }}
              >
                📱 Phone <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Students join via code</span>
              </button>
            </div>
          </div>

          {/* ── LLM Provider Toggle ── */}
          <div>
            <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.75rem' }}>AI Provider</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setLlmProvider('lmstudio')}
                style={{
                  flex: 1, minWidth: '130px', padding: '0.9rem', borderRadius: '10px', border: '2px solid',
                  borderColor: llmProvider === 'lmstudio' ? '#a78bfa' : 'rgba(255,255,255,0.15)',
                  background: llmProvider === 'lmstudio' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                🖥️ LM Studio <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Local · Free · GUI</span>
              </button>
              <button
                onClick={() => setLlmProvider('mistral')}
                style={{
                  flex: 1, minWidth: '130px', padding: '0.9rem', borderRadius: '10px', border: '2px solid',
                  borderColor: llmProvider === 'mistral' ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                  background: llmProvider === 'mistral' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                🌫️ Mistral.ai <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Cloud · Fast · Key needed</span>
              </button>
              <button
                onClick={() => setLlmProvider('gemini')}
                style={{
                  flex: 1, minWidth: '130px', padding: '0.9rem', borderRadius: '10px', border: '2px solid',
                  borderColor: llmProvider === 'gemini' ? '#4d9fff' : 'rgba(255,255,255,0.15)',
                  background: llmProvider === 'gemini' ? 'rgba(77,159,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                ✨ Gemini <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Cloud · Fast · Key needed</span>
              </button>
              <button
                onClick={() => setLlmProvider('groq')}
                style={{
                  flex: 1, minWidth: '130px', padding: '0.9rem', borderRadius: '10px', border: '2px solid',
                  borderColor: llmProvider === 'groq' ? '#f97316' : 'rgba(255,255,255,0.15)',
                  background: llmProvider === 'groq' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                ⚡ Groq <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Cloud · Ultra Fast · Free</span>
              </button>
            </div>
          </div>

          {/* ── LM Studio info (only shown when LM Studio is selected) ── */}
          {llmProvider === 'lmstudio' && (
            <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' }}>Using: Gemma 4 E4B Q4_K_M (or whichever model is loaded)</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Make sure LM Studio&apos;s local server is running:</p>
              <code style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Developer tab → Start Server (port 1234)</code>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Load your model in the top dropdown before generating.</p>
            </div>
          )}

          {/* ── Groq info (only shown when Groq is selected) ── */}
          {llmProvider === 'groq' && (
            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' }}>Using: Llama 3.3 70B via Groq Cloud</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Ultra-fast inference powered by Groq LPU hardware.</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>API key configured in server environment — no setup needed.</p>
            </div>
          )}

          {/* ── Gemini Key (only shown when Gemini is selected) ── */}
          {llmProvider === 'gemini' && (
            <div>
              <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Google Gemini API Key</label>
              <input 
                type="password" 
                value={geminiKey} 
                onChange={e => setGeminiKey(e.target.value)} 
                className={styles.input} 
                placeholder="AIza..." 
                style={{ width: '100%' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Stored locally in your browser only — never sent anywhere except directly to Google.</p>
            </div>
          )}

          {/* ── Mistral Settings (only shown when Mistral is selected) ── */}
          {llmProvider === 'mistral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Mistral API Key</label>
                <input 
                  type="password" 
                  value={mistralKey} 
                  onChange={e => setMistralKey(e.target.value)} 
                  className={styles.input} 
                  placeholder="Itfi3i..." 
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Mistral Model</label>
                <select
                  value={mistralModel}
                  onChange={e => setMistralModel(e.target.value)}
                  className={styles.input}
                  style={{ width: '100%' }}
                >
                  <option value="mistral-small-latest">Mistral Small (Fastest)</option>
                  <option value="mistral-medium-latest">Mistral Medium (Balanced)</option>
                  <option value="mistral-large-latest">Mistral Large (High Quality)</option>
                  <option value="pixtral-12b-2409">Pixtral 12B (Visual support)</option>
                </select>
              </div>
            </div>
          )}

        </div>
        <button onClick={() => setSettingsOpen(false)} style={{ marginTop: '2rem' }}>Save &amp; Close</button>
      </div>
    </div>
  );


  if (!activeClass) {
    const FOLDER_COLORS = [
      "0, 255, 65",   // Green
      "0, 229, 255",  // Cyan
      "255, 184, 0",  // Yellow
      "255, 45, 120", // Pink
      "188, 19, 254", // Purple
      "255, 107, 53"  // Orange
    ];

    return (
      <div className={styles.container}>
        <div className={styles.neuralGrid} />
        <div className={styles.inner}>
          <span className="label-caps" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>Project S.E.R.U</span>
          <h1 style={{ marginTop: '0.5rem', textTransform: 'uppercase', fontWeight: 900 }}>Management Console</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button className={styles.switchBtn} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ArrowLeft size={18} /> BACK TO SYSTEM
              </button>
            </Link>
            <button onClick={() => setSettingsOpen(true)} className={styles.switchBtn} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid var(--accent-glow)' }}>
              <Settings size={18} /> CORE SETTINGS
            </button>
          </div>
          
          <div className={styles.classList} style={{ marginTop: '2rem' }}>
            {folders.map((cat, idx) => {
              const folderClasses = classes.filter(c => (c.category || "General") === cat);
              const folderColor = FOLDER_COLORS[idx % FOLDER_COLORS.length];
              
              return (
                <div key={cat} style={{ 
                  marginBottom: '2.5rem', 
                  padding: '2.5rem', 
                  border: `1px solid rgba(${folderColor}, 0.1)`, 
                  borderRadius: '16px', 
                  background: `linear-gradient(135deg, rgba(${folderColor}, 0.03) 0%, transparent 100%)`,
                  backdropFilter: 'blur(10px)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: `rgb(${folderColor})`, boxShadow: `0 0 10px rgb(${folderColor})` }} />
                      <h2 style={{ color: `rgb(${folderColor})`, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.5rem', margin: 0 }}>{cat}</h2>
                    </div>
                    {folderClasses.length === 0 && (
                       <button onClick={() => { if(confirm(`Delete empty folder ${cat}?`)) removeFolder(cat) }} className={styles.removeBtn} style={{ fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.5rem 1rem', width: 'auto', height: 'auto', borderRadius: '8px' }}>DELETE FOLDER</button>
                    )}
                  </div>
                  
                  {folderClasses.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                      Folder is empty. Initialize a new node below.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {folderClasses.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                          <button 
                            onClick={() => setActiveClass(c.id)} 
                            className={styles.classBtn} 
                            style={{ 
                              flex: 1, 
                              // @ts-ignore
                              "--folder-color-rgb": folderColor 
                            }}
                          >
                            {c.name}
                          </button>
                          <select 
                            value={c.category || "General"}
                            onChange={(e) => updateClassCategory(c.id, e.target.value)}
                            style={{ 
                              padding: '0 1.5rem', 
                              background: 'rgba(255,255,255,0.03)', 
                              color: 'white', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              borderRadius: '10px', 
                              height: '80px', 
                              width: '240px', 
                              cursor: 'pointer', 
                              fontSize: '1rem',
                              fontWeight: 700,
                              fontFamily: 'Space Grotesk'
                            }}
                          >
                            {folders.map(f => <option key={f} value={f}>MOVE TO {f.toUpperCase()}</option>)}
                          </select>
                          <button 
                            onClick={() => { if(confirm("Are you sure you want to delete this class?")) removeClass(c.id) }} 
                            className={styles.removeBtn}
                            style={{ height: '80px', width: '80px', fontSize: '1.5rem', background: 'rgba(255,45,120,0.05)' }}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: '3rem', 
            padding: '2.5rem', 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '20px'
          }}>
            <h2 style={{ marginBottom: '1.5rem', letterSpacing: '2px', fontWeight: 900, textAlign: 'center' }}>SYSTEM INITIALIZATION</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.addStudentBar}>
                 <input 
                   type="text" 
                   value={newFolderName}
                   onChange={e => setNewFolderName(e.target.value)}
                   placeholder="NEW FOLDER NAME..."
                   className={styles.input}
                 />
                 <button 
                   onClick={() => {
                     if (newFolderName.trim()) {
                       addFolder(newFolderName.trim());
                       setNewFolderName("");
                       setNewClassCategory(newFolderName.trim());
                     }
                   }} 
                   className={styles.switchBtn}
                   style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                 >
                   <FolderPlus size={20} /> CREATE FOLDER
                 </button>
              </div>
              
              <div className={styles.addStudentBar}>
                <select 
                  value={newClassCategory} 
                  onChange={(e) => setNewClassCategory(e.target.value)}
                  className={styles.input}
                  style={{ flex: 0.4, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {folders.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
                <input 
                  type="text" 
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="IDENTIFIER: NEW CLASS..." 
                  className={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newClassName.trim()) {
                      addClass(newClassName.trim(), newClassCategory);
                      setNewClassName("");
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newClassName.trim()) {
                      addClass(newClassName.trim(), newClassCategory);
                      setNewClassName("");
                    }
                  }}
                  className={styles.primaryBtn}
                >
                  DEPLOY NODE
                </button>
              </div>
            </div>
          </div>
        </div>

        {settingsModal}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
               <span className="label-caps" style={{ color: 'var(--accent)', letterSpacing: '0.2em', marginBottom: '-2px' }}>Project S.E.R.U</span>
               <input 
                 value={activeClass.name} 
                 onChange={e => updateClass(activeClass.id, e.target.value)} 
                 className={styles.classNameInput} 
               />
            </div>
            <select 
              value={activeClass.category || "General"} 
              onChange={e => updateClassCategory(activeClass.id, e.target.value)} 
              className={styles.classNameInput} 
              style={{ flex: 0.5, fontSize: "clamp(1rem, 1.5vw, 1.5rem)", color: "rgba(255,255,255,0.6)", background: 'transparent', cursor: 'pointer' }}
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
            <button className={styles.switchBtn} onClick={() => setSettingsOpen(true)}><Settings size={18} /> SETTINGS</button>
            <button className={styles.switchBtn} onClick={() => setActiveClass(null)}>SWITCH NODE</button>
          </div>
        </header>

        <div className={styles.insightsPanel}>
          <h2><Zap size={22} color="var(--accent)" /> SYSTEM DIAGNOSTICS</h2>
          <div className={styles.insightsGrid}>
            <div className={styles.insightBox}>
              <span>Level Trend:</span> <strong>{insights.predominantLevel}</strong>
            </div>
            <div className={styles.insightBox}>
              <span>Energy Trend:</span> <strong>{insights.predominantEnergy}</strong>
            </div>
          </div>
          <p className={styles.suggestion}>{insights.suggestion}</p>
        </div>

        <div className={styles.actionsGrid}>
          <Link href="/teams" style={{ textDecoration: 'none', display: 'block' }}>
            <button className={styles.actionBtn} style={{ width: '100%' }}><Users size={24} /> UNIT GENERATOR</button>
          </Link>
          <Link href="/games" style={{ textDecoration: 'none', display: 'block' }}>
            <button className={styles.actionBtn} style={{ width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(0, 255, 65, 0.03)' }}><Brain size={24} /> NEURAL ARCADE</button>
          </Link>
          <Link href="/prompts" style={{ textDecoration: 'none', display: 'block' }}>
            <button className={styles.actionBtn} style={{ width: '100%' }}><Zap size={24} /> PROMPT CORE</button>
          </Link>
          <Link href="/wheel" style={{ textDecoration: 'none', display: 'block' }}>
            <button className={styles.actionBtn} style={{ width: '100%' }}><Zap size={24} /> PROBABILITY WHEEL</button>
          </Link>
        </div>

        <div className={styles.studentsSection}>
          <div 
            className={styles.rosterHeader}
            onClick={() => setRosterOpen(prev => !prev)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <h2>Roster ({activeClass.students.length})</h2>
            <span className={styles.collapseIcon} style={{ transform: rosterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
          </div>
          
          {rosterOpen && (
            <>
              <div className={styles.addStudentBar}>
                <input 
                  type="text" 
                  value={newStudentName} 
                  onChange={(e) => setNewStudentName(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text.includes("\n")) {
                      e.preventDefault();
                      const names = text.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
                      if (names.length > 0) {
                        bulkAddStudents(activeClass.id, names);
                      }
                      setNewStudentName("");
                    }
                  }}
                  placeholder="Student Name (paste from Excel)..." 
                  className={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStudentName.trim()) {
                      addStudent(activeClass.id, newStudentName.trim());
                      setNewStudentName("");
                    }
                  }}
                />
                <button onClick={() => {
                  if (newStudentName.trim()) {
                    addStudent(activeClass.id, newStudentName.trim());
                    setNewStudentName("");
                  }
                }}>Add</button>
              </div>

              <div className={styles.studentList}>
                {activeClass.students.map(student => (
                  <div key={student.id} className={styles.studentCard}>
                    <input 
                      value={student.name}
                      onChange={e => updateStudent(activeClass.id, student.id, { name: e.target.value })}
                      className={styles.studentNameInput}
                    />
                    <div className={styles.tags}>
                      <label>English Fluency
                        <select value={student.level} onChange={(e) => updateStudent(activeClass.id, student.id, { level: e.target.value as Level })}>
                          <option value="Low">Low Lvl</option>
                          <option value="Mid">Mid Lvl</option>
                          <option value="High">High Lvl</option>
                        </select>
                      </label>
                      <label>Energy Level
                        <select value={student.energy} onChange={(e) => updateStudent(activeClass.id, student.id, { energy: e.target.value as Energy })}>
                          <option value="Passive">Passive</option>
                          <option value="Normal">Normal</option>
                          <option value="Active">Active</option>
                        </select>
                      </label>
                      <label>Confidence & Output
                        <select value={student.confidence} onChange={(e) => updateStudent(activeClass.id, student.id, { confidence: e.target.value as Level })}>
                          <option value="Low">Low Conf</option>
                          <option value="Mid">Mid Conf</option>
                          <option value="High">High Conf</option>
                        </select>
                      </label>
                      <button className={styles.removeBtn} onClick={() => removeStudent(activeClass.id, student.id)}>X</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {settingsModal}
    </div>
  );
}
