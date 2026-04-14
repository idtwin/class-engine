import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { playSFX } from "../lib/audio";

export type Level = "Low" | "Mid" | "High";
export type Energy = "Passive" | "Normal" | "Active";

export interface Student {
  id: string;
  name: string;
  level: Level;
  confidence: Level;
  energy: Energy;
}

export interface ClassData {
  id: string;
  name: string;
  category?: string;
  students: Student[];
}

export interface Team {
  id: string;
  name: string;
  students: Student[];
  score: number;
}

export interface SessionEntry {
  id: string;
  classId: string;
  className: string;
  gameType: string;
  scores: Record<string, number>;
  totalScore: number;
  accuracy: number;
  energy: number;
  timestamp: number;
}

export interface SavedBoard {
  id: string;
  title: string;
  gameType: string;
  topic: string;
  content: any;
  timestamp: number;
}

interface ClassroomState {
  folders: string[];
  classes: ClassData[];
  activeClassId: string | null;
  currentTeams: Team[];
  sessionHistory: SessionEntry[];
  
  // App state
  twistVisible: boolean;
  currentTwist: string;
  triggerTwist: () => void;
  closeTwist: () => void;
  
  teacherFeedback: { difficulty: number, energyBoost: number };
  submitFeedback: (type: "Too easy" | "Too hard" | "Low energy" | "High engagement") => void;

  // Settings/Keys
  llmProvider: "gemini" | "mistral" | "lmstudio" | "groq";
  setLlmProvider: (p: "gemini" | "mistral" | "lmstudio" | "groq") => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  mistralKey: string;
  setMistralKey: (key: string) => void;
  groqKey: string;
  setGroqKey: (key: string) => void;
  geminiModel: string;
  setGeminiModel: (m: string) => void;
  mistralModel: string;
  setMistralModel: (m: string) => void;
  groqModel: string;
  setGroqModel: (m: string) => void;
  getActiveApiKey: () => string;
  getActiveModel: () => string;
  
  activeRoomCode: string | null;
  setActiveRoomCode: (code: string | null) => void;
  playMode: 'projector' | 'phone';
  setPlayMode: (mode: 'projector' | 'phone') => void;

  // Actions
  addClass: (name: string, category?: string) => void;
  removeClass: (classId: string) => void;
  setActiveClass: (classId: string | null) => void;
  updateClass: (classId: string, name: string) => void;
  updateClassCategory: (classId: string, category: string) => void;
  
  addFolder: (name: string) => void;
  removeFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;

  addStudent: (classId: string, name: string) => void;
  removeStudent: (classId: string, studentId: string) => void;
  updateStudent: (classId: string, studentId: string, updates: Partial<Student>) => void;
  bulkAddStudents: (classId: string, names: string[]) => void;
  
  generateTeams: (classId: string, numberOfTeams: number, presentStudentIds?: string[]) => void;
  updateTeamScore: (teamId: string, delta: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  updateTeamName: (teamId: string, name: string) => void;
  moveStudentToTeam: (studentId: string, targetTeamId: string) => void;
  resetTeamsState: () => void;
  
  activeAwardAmount: number;
  setActiveAwardAmount: (amt: number) => void;

  saveSession: (session: Omit<SessionEntry, 'id' | 'timestamp'>) => void;
  purgeDemoData: () => void;
  seedDemoData: () => void;

  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  savedBoards: SavedBoard[];
  saveBoard: (board: Omit<SavedBoard, 'id' | 'timestamp'>) => void;
  deleteBoard: (id: string) => void;
  
  commandLogs: string[];
  addLog: (message: string) => void;
}

const DEMO_STUDENTS: Student[] = [
  { id: uuidv4(), name: "Ahmad Rizqi Arrayan", level: "Low", confidence: "Mid", energy: "Normal" },
  { id: uuidv4(), name: "Aeni Putri", level: "Mid", confidence: "Low", energy: "Passive" },
  { id: uuidv4(), name: "Al Vinzha Febriano", level: "Low", confidence: "High", energy: "Active" },
  { id: uuidv4(), name: "Dimas Pratama Yulianto", level: "High", confidence: "High", energy: "Active" },
  { id: uuidv4(), name: "Dinar Arya Putra", level: "High", confidence: "High", energy: "Active" },
  { id: uuidv4(), name: "Fakhri Ramadhan", level: "Mid", confidence: "Mid", energy: "Normal" },
  { id: uuidv4(), name: "Ibnu Akhdaan", level: "Mid", confidence: "Mid", energy: "Active" },
  { id: uuidv4(), name: "Keyla Wati Lestari", level: "High", confidence: "High", energy: "Normal" },
  { id: uuidv4(), name: "Levy Cipta Astinto", level: "Mid", confidence: "Low", energy: "Passive" },
  { id: uuidv4(), name: "Muhammad Ibnu Kamil", level: "Low", confidence: "Low", energy: "Normal" },
];

export const useClassroomStore = create<ClassroomState>()(
  persist(
    (set, get) => ({
      commandLogs: ["[SYSTEM] Midnight Command Core Online"],
      addLog: (message) => set((state) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        return { commandLogs: [`[${timestamp}] ${message}`, ...state.commandLogs].slice(0, 50) };
      }),
      folders: ["General", "Demo"],
      classes: [
        {
          id: "demo-class-1",
          name: "XI – I (Demo)",
          category: "Demo",
          students: DEMO_STUDENTS
        }
      ],
      activeClassId: "demo-class-1",
      currentTeams: [],
      sessionHistory: [],

      // --- Session Logic ---
      saveSession: (session) => set((state) => {
        const newEntry: SessionEntry = {
          ...session,
          id: uuidv4(),
          timestamp: Date.now()
        };
        const timestampStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        return {
          sessionHistory: [newEntry, ...state.sessionHistory].slice(0, 100),
          commandLogs: [`[${timestampStr}] SESSION_SAVED: ${session.gameType} (${session.totalScore} pts)`, ...state.commandLogs].slice(0, 50)
        };
      }),

      purgeDemoData: () => set((state) => ({
        sessionHistory: state.sessionHistory.filter(s => s.classId !== "demo-class-1"),
        classes: state.classes.filter(c => c.id !== "demo-class-1"),
        activeClassId: state.activeClassId === "demo-class-1" ? null : state.activeClassId,
        currentTeams: state.activeClassId === "demo-class-1" ? [] : state.currentTeams
      })),

      seedDemoData: () => set((state) => {
        const gameTypes = ["Fix It", "Rapid Fire", "Odd One Out", "Jeopardy", "Would You Rather"];
        const demoSessions: SessionEntry[] = [];
        const now = Date.now();
        
        for (let i = 0; i < 15; i++) {
          const game = gameTypes[Math.floor(Math.random() * gameTypes.length)];
          const acc = 60 + Math.floor(Math.random() * 30);
          const score = 1000 + Math.floor(Math.random() * 1500);
          demoSessions.push({
            id: uuidv4(),
            classId: "demo-class-1",
            className: "XI – I (Demo)",
            gameType: game,
            scores: { "Team 1": score, "Team 2": score - 200 },
            totalScore: score * 2 - 200,
            accuracy: acc,
            energy: 70 + Math.floor(Math.random() * 20),
            timestamp: now - (i * 2 * 24 * 60 * 60 * 1000)
          });
        }

        return { sessionHistory: [...demoSessions, ...state.sessionHistory].slice(0, 100) };
      }),

      // --- Class Actions ---
      addClass: (name, category = "General") => set((state) => ({
          folders: state.folders.includes(category) ? state.folders : [...state.folders, category],
          classes: [...state.classes, { id: uuidv4(), name, category, students: [] }]
      })),
      
      removeClass: (classId) => set((state) => ({
        classes: state.classes.filter((c) => c.id !== classId),
        activeClassId: state.activeClassId === classId ? null : state.activeClassId,
        sessionHistory: state.sessionHistory.filter(s => s.classId !== classId)
      })),

      setActiveClass: (classId) => set({ activeClassId: classId }),

      updateClass: (classId, name) => set((state) => ({
        classes: state.classes.map(c => c.id === classId ? { ...c, name } : c)
      })),

      updateClassCategory: (classId, category) => set((state) => ({
        folders: state.folders.includes(category) ? state.folders : [...state.folders, category],
        classes: state.classes.map(c => c.id === classId ? { ...c, category } : c)
      })),

      addFolder: (name) => set(state => ({
        folders: state.folders.includes(name) ? state.folders : [...state.folders, name]
      })),

      removeFolder: (name) => set(state => ({
        folders: state.folders.filter(f => f !== name),
        classes: state.classes.map(c => c.category === name ? { ...c, category: "General" } : c)
      })),

      renameFolder: (oldName, newName) => set(state => ({
        folders: state.folders.map(f => f === oldName ? newName : f),
        classes: state.classes.map(c => c.category === oldName ? { ...c, category: newName } : c)
      })),

      // --- Student Actions ---
      addStudent: (classId, name) => set((state) => ({
        classes: state.classes.map((c) => 
          c.id === classId 
            ? { ...c, students: [...c.students, { id: uuidv4(), name, level: "Mid", confidence: "Mid", energy: "Normal" }] } 
            : c
        )
      })),

      removeStudent: (classId, studentId) => set((state) => ({
        classes: state.classes.map((c) => 
          c.id === classId 
            ? { ...c, students: c.students.filter(s => s.id !== studentId) } 
            : c
        )
      })),

      updateStudent: (classId, studentId, updates) => set((state) => ({
        classes: state.classes.map((c) => 
          c.id === classId 
            ? { ...c, students: c.students.map(s => s.id === studentId ? { ...s, ...updates } : s) } 
            : c
        )
      })),

      bulkAddStudents: (classId, names) => set((state) => ({
        classes: state.classes.map((c) => {
          if (c.id !== classId) return c;
          const newStudents = names.map(n => ({ id: uuidv4(), name: n, level: "Mid" as Level, confidence: "Mid" as Level, energy: "Normal" as Energy }));
          return { ...c, students: [...c.students, ...newStudents] };
        })
      })),

      // --- Team Actions ---
      generateTeams: (classId, numberOfTeams, presentStudentIds) => set((state) => {
        const cls = state.classes.find(c => c.id === classId);
        if (!cls) return state;
        
        let pool = [...cls.students];
        if (presentStudentIds && presentStudentIds.length > 0) {
          pool = pool.filter(s => presentStudentIds.includes(s.id));
        }

        const levelMap: Record<Level, number> = { High: 3, Mid: 2, Low: 1 };
        pool.sort((a, b) => levelMap[b.level] - levelMap[a.level]);

        const teams: Team[] = Array.from({ length: numberOfTeams }, (_, i) => ({
          id: uuidv4(),
          name: `Team ${i + 1}`,
          students: [],
          score: 0
        }));

        let reverse = false;
        let teamIdx = 0;
        
        pool.forEach((student) => {
          teams[teamIdx].students.push(student);
          if (!reverse) {
            teamIdx++;
            if (teamIdx >= numberOfTeams) { teamIdx = numberOfTeams - 1; reverse = true; }
          } else {
            teamIdx--;
            if (teamIdx < 0) { teamIdx = 0; reverse = false; }
          }
        });

        return { currentTeams: teams };
      }),

      updateTeamScore: (teamId, delta) => set((state) => {
        if (delta > 0) playSFX("correct");
        if (delta < 0) playSFX("wrong");
        return { currentTeams: state.currentTeams.map(t => t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t) };
      }),

      setTeamScore: (teamId, score) => set((state) => ({
        currentTeams: state.currentTeams.map(t => t.id === teamId ? { ...t, score } : t)
      })),

      updateTeamName: (teamId, name) => set((state) => ({
        currentTeams: state.currentTeams.map(t => t.id === teamId ? { ...t, name } : t)
      })),

      moveStudentToTeam: (studentId, targetTeamId) => set((state) => {
        let studentToMove: Student | undefined;
        const newTeams = state.currentTeams.map(t => {
          const student = t.students.find(s => s.id === studentId);
          if (student) studentToMove = student;
          return { ...t, students: t.students.filter(s => s.id !== studentId) };
        });
        if (studentToMove) {
          const target = newTeams.find(t => t.id === targetTeamId);
          if (target) target.students.push(studentToMove);
        }
        return { currentTeams: newTeams };
      }),

      resetTeamsState: () => set((state) => ({
        currentTeams: state.currentTeams.map((t, i) => ({ ...t, name: `Team ${i + 1}`, score: 0 }))
      })),

      activeAwardAmount: 100,
      setActiveAwardAmount: (amt) => set({ activeAwardAmount: amt }),

      // --- App State ---
      twistVisible: false,
      currentTwist: "",
      triggerTwist: () => set((state) => {
        playSFX("twist");
        const twists = ["Short answers!", "Act it out!", "Whisper!"];
        return { twistVisible: true, currentTwist: twists[Math.floor(Math.random() * twists.length)] };
      }),
      closeTwist: () => set({ twistVisible: false }),

      teacherFeedback: { difficulty: 0, energyBoost: 0 },
      submitFeedback: (type) => set((state) => {
        let { difficulty, energyBoost } = state.teacherFeedback;
        if (type === "Too easy") difficulty += 1;
        if (type === "Too hard") difficulty -= 1;
        if (type === "Low energy") energyBoost += 1;
        if (type === "High engagement") energyBoost -= 1;
        return { teacherFeedback: { difficulty, energyBoost } };
      }),

      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      activeRoomCode: null,
      setActiveRoomCode: (code) => set({ activeRoomCode: code }),
      playMode: 'projector',
      setPlayMode: (mode) => set({ playMode: mode }),

      // --- Boards ---
      savedBoards: [],
      saveBoard: (board) => set((state) => ({
        savedBoards: [...state.savedBoards, { ...board, id: uuidv4(), timestamp: Date.now() }]
      })),
      deleteBoard: (id) => set((state) => ({
        savedBoards: state.savedBoards.filter(b => b.id !== id)
      })),

      // --- Settings ---
      llmProvider: "mistral",
      setLlmProvider: (p) => set({ llmProvider: p }),
      geminiKey: "",
      setGeminiKey: (key) => set({ geminiKey: key }),
      mistralKey: "Itfi3iUZwTF9lAST1SdvOfwftSdgO7La",
      setMistralKey: (key) => set({ mistralKey: key }),
      groqKey: "",
      setGroqKey: (key) => set({ groqKey: key }),
      geminiModel: "gemini-2.5-flash",
      setGeminiModel: (m) => set({ geminiModel: m }),
      mistralModel: "mistral-small-latest",
      setMistralModel: (m) => set({ mistralModel: m }),
      groqModel: "llama-3.3-70b-versatile",
      setGroqModel: (m) => set({ groqModel: m }),
      getActiveApiKey: () => {
        const { llmProvider, geminiKey, mistralKey, groqKey } = get();
        if (llmProvider === "gemini")  return geminiKey;
        if (llmProvider === "groq")    return groqKey;
        return mistralKey; // mistral + lmstudio both use mistralKey slot
      },
      getActiveModel: () => {
        const { llmProvider, geminiModel, mistralModel, groqModel } = get();
        if (llmProvider === "gemini")  return geminiModel;
        if (llmProvider === "groq")    return groqModel;
        return mistralModel; // mistral + lmstudio
      }
    }),
    {
      name: "classroom-engine-storage",
    }
  )
);
