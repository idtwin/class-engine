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

  const activeClass = classes.find(c => c.id === activeClassId);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const { geminiKey, setGeminiKey, llmProvider, setLlmProvider, ollamaModel, setOllamaModel } = useClassroomStore();

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
                onClick={() => setLlmProvider('ollama')}
                style={{
                  flex: 1, minWidth: '130px', padding: '0.9rem', borderRadius: '10px', border: '2px solid',
                  borderColor: llmProvider === 'ollama' ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                  background: llmProvider === 'ollama' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.04)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                🦙 Ollama <span style={{ fontWeight: 400, fontSize: '0.8rem', opacity: 0.6, display: 'block' }}>Local · Free · CLI</span>
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

          {/* ── Ollama Model (only shown when Ollama is selected) ── */}
          {llmProvider === 'ollama' && (
            <div>
              <label style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Ollama Model</label>
              <select
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                className={styles.input}
                style={{ width: '100%' }}
              >
                <option value="gemma3:4b">gemma3:4b — Recommended (RTX 4050)</option>
                <option value="gemma3:12b">gemma3:12b — Higher quality (12GB+ VRAM)</option>
                <option value="llama3.2:3b">llama3.2:3b — Fastest (low VRAM)</option>
                <option value="llama3.1:8b">llama3.1:8b — Balanced</option>
                <option value="mistral:7b">mistral:7b — Alternative 7B</option>
                <option value="qwen2.5:7b">qwen2.5:7b — Strong JSON output</option>
              </select>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Make sure Ollama is running: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ollama serve</code></p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Pull model: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ollama pull {ollamaModel}</code></p>
            </div>
          )}

        </div>
        <button onClick={() => setSettingsOpen(false)} style={{ marginTop: '2rem' }}>Save &amp; Close</button>
      </div>
    </div>
  );


  if (!activeClass) {
    return (
      <div className={styles.container}>
        <h1>Classroom Engine</h1>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className={styles.switchBtn} style={{ background: 'var(--panel)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={20} /> Home
            </button>
          </Link>
          <button onClick={() => setSettingsOpen(true)} className={styles.switchBtn} style={{ background: 'var(--panel)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} /> Settings
          </button>
        </div>
        
        <div className={styles.classList}>
          {folders.map(cat => {
            const folderClasses = classes.filter(c => (c.category || "General") === cat);
            return (
              <div key={cat} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>{cat}</h2>
                  {folderClasses.length === 0 && (
                     <button onClick={() => { if(confirm(`Delete empty folder ${cat}?`)) removeFolder(cat) }} className={styles.removeBtn} style={{ fontSize: '1rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.5rem 1rem', width: 'auto', height: 'auto', borderRadius: '8px' }}>Delete Empty Folder</button>
                  )}
                </div>
                
                {folderClasses.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    This folder is empty. Create a class below!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {folderClasses.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={() => setActiveClass(c.id)} className={styles.classBtn} style={{ flex: 1 }}>
                          {c.name}
                        </button>
                        <select 
                          value={c.category || "General"}
                          onChange={(e) => updateClassCategory(c.id, e.target.value)}
                          style={{ padding: '0 1rem', background: 'var(--panel)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', height: '80px', width: '200px', cursor: 'pointer', fontSize: '1.1rem' }}
                        >
                          {folders.map(f => <option key={f} value={f}>Move to {f}</option>)}
                        </select>
                        <button 
                          onClick={() => { if(confirm("Are you sure you want to delete this class?")) removeClass(c.id) }} 
                          className={styles.removeBtn}
                          style={{ height: '80px', width: '80px', fontSize: '1.5rem', background: 'var(--panel)' }}
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
        
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Create New</h2>
          
          <div className={styles.addStudentBar}>
             <input 
               type="text" 
               value={newFolderName}
               onChange={e => setNewFolderName(e.target.value)}
               placeholder="New Folder Name..."
               className={styles.input}
             />
             <button onClick={() => {
               if (newFolderName.trim()) {
                 addFolder(newFolderName.trim());
                 setNewFolderName("");
                 setNewClassCategory(newFolderName.trim());
               }
             }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}><FolderPlus size={20} /> Create Folder</button>
          </div>
          
          <div className={styles.addStudentBar} style={{ marginTop: '1rem' }}>
            <select 
              value={newClassCategory} 
              onChange={(e) => setNewClassCategory(e.target.value)}
              className={styles.input}
              style={{ flex: 0.5, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)' }}
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input 
              type="text" 
              value={newClassName} 
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Create New Class..." 
              className={styles.input}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newClassName.trim()) {
                  addClass(newClassName.trim(), newClassCategory);
                  setNewClassName("");
                }
              }}
            />
            <button onClick={() => {
              if (newClassName.trim()) {
                addClass(newClassName.trim(), newClassCategory);
                setNewClassName("");
              }
            }}>Create Class</button>
          </div>
        </div>

        {settingsModal}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <input 
            value={activeClass.name} 
            onChange={e => updateClass(activeClass.id, e.target.value)} 
            className={styles.classNameInput} 
          />
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
          <button className={styles.switchBtn} onClick={() => setSettingsOpen(true)}><Settings size={20} /></button>
          <button className={styles.switchBtn} onClick={() => setActiveClass(null)}>Switch Class</button>
        </div>
      </header>

      <div className={styles.insightsPanel}>
        <h2><Zap size={24} /> Quick Insights</h2>
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
          <button className={styles.actionBtn} style={{ width: '100%' }}><Users size={24} /> Generate Teams</button>
        </Link>
        <Link href="/games" style={{ textDecoration: 'none', display: 'block' }}>
          <button className={styles.actionBtn} style={{ width: '100%' }}><Brain size={24} /> Game Arcade</button>
        </Link>
        <Link href="/prompts" style={{ textDecoration: 'none', display: 'block' }}>
          <button className={styles.actionBtn} style={{ width: '100%' }}><Zap size={24} /> Prompts</button>
        </Link>
        <Link href="/wheel" style={{ textDecoration: 'none', display: 'block' }}>
          <button className={styles.actionBtn} style={{ width: '100%' }}><Zap size={24} /> Spin the Wheel</button>
        </Link>
      </div>

      <div className={styles.studentsSection}>
        <h2>Roster ({activeClass.students.length})</h2>
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
      </div>

      {settingsModal}
    </div>
  );
}
