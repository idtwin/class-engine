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
  twistVisible: boolean;
  currentTwist: string;
  triggerTwist: () => void;
  closeTwist: () => void;
  teacherFeedback: { difficulty: number, energyBoost: number };
  submitFeedback: (type: "Too easy" | "Too hard" | "Low energy" | "High engagement") => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  mistralKey: string;
  setMistralKey: (key: string) => void;
  mistralModel: string;
  setMistralModel: (m: string) => void;
  llmProvider: "gemini" | "mistral" | "lmstudio" | "groq";
  setLlmProvider: (p: "gemini" | "mistral" | "lmstudio" | "groq") => void;
  activeRoomCode: string | null;
  setActiveRoomCode: (code: string | null) => void;
  playMode: 'projector' | 'phone';
  setPlayMode: (mode: 'projector' | 'phone') => void;
  generateTeams: (classId: string, numberOfTeams: number) => void;
  updateTeamScore: (teamId: string, delta: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  updateTeamName: (teamId: string, name: string) => void;
  resetTeamsState: () => void;
  activeAwardAmount: number;
  setActiveAwardAmount: (amt: number) => void;
  moveStudentToTeam: (studentId: string, targetTeamId: string) => void;
  addClass: (name: string, category?: string) => void;
  removeClass: (classId: string) => void;
  setActiveClass: (classId: string | null) => void;
  updateClassCategory: (classId: string, category: string) => void;
  addFolder: (name: string) => void;
  removeFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  addStudent: (classId: string, name: string) => void;
  removeStudent: (classId: string, studentId: string) => void;
  updateStudent: (classId: string, studentId: string, updates: Partial<Student>) => void;
  updateClass: (classId: string, name: string) => void;
  bulkAddStudents: (classId: string, names: string[]) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  savedBoards: SavedBoard[];
  saveBoard: (board: Omit<SavedBoard, 'id' | 'timestamp'>) => void;
  deleteBoard: (id: string) => void;
  commandLogs: string[];
  addLog: (message: string) => void;
}

export const useClassroomStore = create<ClassroomState>()(
  persist(
    (set) => ({
      commandLogs: ["[SYSTEM] Midnight Command Core Online"],
      addLog: (message) => set((state) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        return { commandLogs: [`[${timestamp}] ${message}`, ...state.commandLogs].slice(0, 50) };
      }),
      folders: ["General"],
      classes: [
        {
          id: "demo-class-1",
          name: "Demo Class",
          students: [
            { id: "1", name: "Alice", level: "High", confidence: "Mid", energy: "Active" },
            { id: "2", name: "Bob", level: "Mid", confidence: "Low", energy: "Passive" },
            { id: "3", name: "Charlie", level: "Low", confidence: "Low", energy: "Passive" },
            { id: "4", name: "David", level: "High", confidence: "High", energy: "Normal" },
            { id: "5", name: "Eve", level: "Mid", confidence: "High", energy: "Active" },
            { id: "6", name: "Frank", level: "Low", confidence: "Mid", energy: "Normal" },
          ]
        }
      ],
      activeClassId: "demo-class-1",
      
      addClass: (name, category = "General") => set((state) => {
        const newFolders = state.folders.includes(category) ? state.folders : [...state.folders, category];
        return {
          folders: newFolders,
          classes: [...state.classes, { id: uuidv4(), name, category, students: [] }]
        };
      }),
      
      removeClass: (classId) => set((state) => ({
        classes: state.classes.filter((c) => c.id !== classId),
        activeClassId: state.activeClassId === classId ? null : state.activeClassId
      })),

      setActiveClass: (classId) => set({ activeClassId: classId }),

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

      updateClass: (classId, name) => set((state) => ({
        classes: state.classes.map(c => c.id === classId ? { ...c, name } : c)
      })),

      updateClassCategory: (classId, category) => set((state) => {
        const newFolders = state.folders.includes(category) ? state.folders : [...state.folders, category];
        return {
          folders: newFolders,
          classes: state.classes.map(c => c.id === classId ? { ...c, category } : c)
        }
      }),

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

      bulkAddStudents: (classId, names) => set((state) => ({
        classes: state.classes.map((c) => {
          if (c.id !== classId) return c;
          const newStudents = names.map(n => ({ id: uuidv4(), name: n, level: "Mid" as Level, confidence: "Mid" as Level, energy: "Normal" as Energy }));
          return { ...c, students: [...c.students, ...newStudents] };
        })
      })),

      currentTeams: [],
      
      generateTeams: (classId, numberOfTeams) => set((state) => {
        const cls = state.classes.find(c => c.id === classId);
        if (!cls) return state;
        
        const students = [...cls.students];
        const high = students.filter(s => s.level === "High").sort(() => Math.random() - 0.5);
        const mid = students.filter(s => s.level === "Mid").sort(() => Math.random() - 0.5);
        const low = students.filter(s => s.level === "Low").sort(() => Math.random() - 0.5);
        
        const pool = [...high, ...mid, ...low];
        
        const teams: Team[] = Array.from({ length: numberOfTeams }, (_, i) => ({
          id: uuidv4(),
          name: `Team ${i + 1}`,
          students: [],
          score: 0
        }));

        pool.forEach((student, index) => {
          teams[index % numberOfTeams].students.push(student);
        });

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        const logMsg = `[${timestamp}] NEURAL SPHERE: GENERATED ${numberOfTeams} TEAMS`;

        return { currentTeams: teams, commandLogs: [logMsg, ...state.commandLogs].slice(0, 50) };
      }),

      updateTeamScore: (teamId, delta) => set((state) => {
        if (delta > 0) playSFX("correct");
        if (delta < 0) playSFX("wrong");
        
        let teamName = "UNKNOWN TEAM";
        const newTeams = state.currentTeams.map(t => {
          if (t.id === teamId) {
            teamName = t.name;
            return { ...t, score: t.score + delta };
          }
          return t;
        });

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        const action = delta > 0 ? `SCORED +${delta}` : `PENALTY ${delta}`;
        const logMsg = `[${timestamp}] ${teamName} ${action}`;

        return {
          currentTeams: newTeams,
          commandLogs: [logMsg, ...state.commandLogs].slice(0, 50)
        };
      }),

      setTeamScore: (teamId, score) => set((state) => ({
        currentTeams: state.currentTeams.map(t => 
          t.id === teamId ? { ...t, score } : t
        )
      })),

      updateTeamName: (teamId, name) => set((state) => ({
        currentTeams: state.currentTeams.map(t =>
          t.id === teamId ? { ...t, name } : t
        )
      })),

      resetTeamsState: () => set((state) => ({
        currentTeams: state.currentTeams.map((t, i) => ({
          ...t,
          name: `Team ${i + 1}`,
          score: 0
        }))
      })),
      activeAwardAmount: 100,
      setActiveAwardAmount: (amt) => set({ activeAwardAmount: amt }),

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

      twistVisible: false,
      currentTwist: "",
      
      triggerTwist: () => set((state) => {
        playSFX("twist");
        const twists = [
          "Answer using 5 words only!",
          "Only one teammate can speak!",
          "Use past tense!",
          "Act it out without words!",
          "Must answer as a question!",
          "Opposing team picks who answers!",
        ];
        const selectedTwist = twists[Math.floor(Math.random() * twists.length)];
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        const logMsg = `[${timestamp}] TWIST DEPLOYED: "${selectedTwist}"`;
        return { twistVisible: true, currentTwist: selectedTwist, commandLogs: [logMsg, ...state.commandLogs].slice(0, 50) };
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
      
      geminiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
      setGeminiKey: (key) => set({ geminiKey: key }),
      mistralKey: "Itfi3iUZwTF9lAST1SdvOfwftSdgO7La",
      setMistralKey: (key) => set({ mistralKey: key }),
      mistralModel: "mistral-small-latest",
      setMistralModel: (m) => set({ mistralModel: m }),
      llmProvider: "mistral",
      setLlmProvider: (p) => set({ llmProvider: p }),
      activeRoomCode: null,
      setActiveRoomCode: (code) => set({ activeRoomCode: code }),
      playMode: 'projector',
      setPlayMode: (mode) => set({ playMode: mode }),
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      
      savedBoards: [],
      saveBoard: (board) => set((state) => ({
        savedBoards: [
          ...state.savedBoards,
          {
            ...board,
            id: uuidv4(),
            timestamp: Date.now()
          }
        ]
      })),
      deleteBoard: (id) => set((state) => ({
        savedBoards: state.savedBoards.filter(b => b.id !== id)
      }))
    }),
    {
      name: "classroom-engine-storage",
    }
  )
);
