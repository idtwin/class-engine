"use client";

import { useState, useEffect, useRef } from "react";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Link2, SkipForward, Zap } from "lucide-react";
import styles from "./chain.module.css";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import ScoreboardOverlay from "../components/ScoreboardOverlay";
import { stopAllSFX } from "../lib/audio";
import GameSettingsDrawer from "../components/GameSettingsDrawer";

type GameMode = "puzzle" | "speed";
type GameState = "SETUP" | "LOADING" | "PLAYING" | "FINISHED";

interface Chain {
  words: string[];
  connections?: string[];
  difficulty?: string;
}

interface SpeedCategory {
  name: string;
  startWord: string;
  validWords: string[];
  difficulty?: string;
}

interface ChainWord {
  word: string;
  teamId?: string;
  teamColor?: string;
}

export default function ChainReaction() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, geminiKey, mistralKey, mistralModel, llmProvider, triggerTwist } = useClassroomStore();

  // Setup
  const [gameMode, setGameMode] = useState<GameMode>("puzzle");
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [timerDuration, setTimerDuration] = useState(15);
  const [roundCount, setRoundCount] = useState(5);
  const [circlesPerChain, setCirclesPerChain] = useState<string>("random");

  // Chain Puzzle state
  const [chains, setChains] = useState<Chain[]>([]);
  const [chainIndex, setChainIndex] = useState(0);
  const [revealedWords, setRevealedWords] = useState<boolean[]>([]);
  const [hintLetters, setHintLetters] = useState<number[]>([]); // how many letters revealed per word
  const [foundBy, setFoundBy] = useState<(string | null)[]>([]); // teamId that found each word

  // Speed Chain state
  const [categories, setCategories] = useState<SpeedCategory[]>([]);
  const [catIndex, setCatIndex] = useState(0);
  const [chainWords, setChainWords] = useState<ChainWord[]>([]);
  const [strikes, setStrikes] = useState<Record<string, number>>({});

  // Shared
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<{ type: "correct" | "wrong" | "hint"; text: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimesUp, setShowTimesUp] = useState(false);

  const guessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => stopAllSFX(); // Silence game on exit
  }, []);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      if (gameMode === "speed") {
        // Timeout = strike
        handleSpeedWrong();
      } else {
        setShowTimesUp(true);
        setTimeout(() => setShowTimesUp(false), 2500);
        // Auto-reveal a letter hint
        handlePuzzleWrong();
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  if (!mounted) return null;

  if (currentTeams.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/games" className={styles.iconBtn}><ArrowLeft size={20} /></Link>
          <h2>Chain Reaction</h2>
        </header>
        <div className={styles.setupContainer}>
          <h1>No Teams Found</h1>
          <p>Generate teams in the Dashboard before playing.</p>
        </div>
      </div>
    );
  }

const TEAM_COLORS = [
  "#00FF41", // Green  - Alpha
  "#00E5FF", // Cyan   - Bravo
  "#FFB800", // Amber  - Charlie
  "#FF2D78", // Pink   - Delta
  "#BC13FE", // Purple - Epsilon
  "#FF9100", // Orange - Zeta
  "#2DD4BF", // Teal   - Eta
  "#F87171", // Red    - Theta
];
  const currentTeam = currentTeams[currentTeamIdx % currentTeams.length];
  const currentColor = TEAM_COLORS[currentTeamIdx % TEAM_COLORS.length];

  // ── Generate ──
  const handleGenerate = async () => {
    if (!topic) return alert("Please enter a topic!");
    setGameState("LOADING");

    try {
      const res = await fetch("/api/generate-chain-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: llmProvider === 'gemini' ? geminiKey : mistralKey, 
          mistralModel, 
          provider: llmProvider, 
          topic, 
          level: difficulty, 
          mode: gameMode,
          count: roundCount,
          circleCount: circlesPerChain
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (gameMode === "puzzle") {
        const ch = data.chains || [];
        if (ch.length === 0) throw new Error("No chains generated.");
        setChains(ch);
        setChainIndex(0);
        initChain(ch[0]);
      } else {
        const cats = data.categories || [];
        if (cats.length === 0) throw new Error("No categories generated.");
        setCategories(cats);
        setCatIndex(0);
        initSpeed(cats[0]);
      }

      setCurrentTeamIdx(0);
      setStrikes(Object.fromEntries(currentTeams.map(t => [t.id, 0])));
      setGameState("PLAYING");
    } catch (err: any) {
      alert("Failed: " + err.message);
      setGameState("SETUP");
    }
  };

  // ── Chain Puzzle helpers ──
  const initChain = (chain: Chain) => {
    const revealed = chain.words.map((_, i) => i === 0 || i === chain.words.length - 1);
    setRevealedWords(revealed);
    setHintLetters(chain.words.map(() => 0));
    setFoundBy(chain.words.map(() => null));
    setGuess("");
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setShowTimesUp(false);
  };

  const currentChain = chains[chainIndex];
  // Find the first unrevealed word (the one we're guessing)
  const activeWordIdx = currentChain ? revealedWords.findIndex((r, i) => !r) : -1;

  const getWordBlanks = (word: string, hintsShown: number) => {
    const letters = word.toUpperCase().split("");
    return letters.map((ch, i) => (i < hintsShown ? ch : "_"));
  };

  const getPointsForWord = (hintsShown: number) => {
    if (hintsShown === 0) return 200;
    if (hintsShown === 1) return 150;
    if (hintsShown === 2) return 100;
    return 50;
  };

  const handlePuzzleGuess = () => {
    if (!currentChain || activeWordIdx === -1) return;
    const target = currentChain.words[activeWordIdx].toUpperCase();
    const g = guess.trim().toUpperCase();
    if (!g) return;

    if (g === target) {
      // Correct!
      const pts = getPointsForWord(hintLetters[activeWordIdx]);
      updateTeamScore(currentTeam.id, pts);

      const newRevealed = [...revealedWords];
      newRevealed[activeWordIdx] = true;
      setRevealedWords(newRevealed);

      const newFoundBy = [...foundBy];
      newFoundBy[activeWordIdx] = currentTeam.id;
      setFoundBy(newFoundBy);

      showFeedback("correct", `+${pts}!`);
      setGuess("");

      // Check if chain is complete
      const allRevealed = newRevealed.every(r => r);
      if (allRevealed) {
        // Bonus for completing the chain
        updateTeamScore(currentTeam.id, 300);
        showFeedback("correct", "+300 CHAIN BONUS!");

        setTimeout(() => {
          if (chainIndex + 1 < chains.length) {
            setChainIndex(chainIndex + 1);
            initChain(chains[chainIndex + 1]);
            setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
          } else {
            setTimerActive(false);
            setGameState("FINISHED");
          }
        }, 1500);
        return;
      }

      // Same team continues, reset timer
      setTimeLeft(timerDuration);
      setTimerActive(true);
    } else {
      // Wrong — reveal a letter, pass turn
      handlePuzzleWrong();
    }

    setGuess("");
    setTimeout(() => guessRef.current?.focus(), 100);
  };

  const handlePuzzleWrong = () => {
    if (!currentChain || activeWordIdx === -1) return;
    const word = currentChain.words[activeWordIdx];
    const newHints = [...hintLetters];
    if (newHints[activeWordIdx] < word.length - 1) {
      newHints[activeWordIdx]++;
    }
    setHintLetters(newHints);

    const blanks = getWordBlanks(word, newHints[activeWordIdx]);
    showFeedback("hint", `Hint: ${blanks.join(" ")}`);

    // Pass turn
    setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setGuess("");
  };

  const skipChain = () => {
    setTimerActive(false);
    if (chainIndex + 1 < chains.length) {
      setChainIndex(chainIndex + 1);
      initChain(chains[chainIndex + 1]);
      setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
    } else {
      setGameState("FINISHED");
    }
  };

  // ── Speed Chain helpers ──
  const initSpeed = (cat: SpeedCategory) => {
    setChainWords([{ word: cat.startWord.toLowerCase(), teamId: undefined, teamColor: undefined }]);
    setGuess("");
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setShowTimesUp(false);
  };

  const currentCategory = categories[catIndex];
  const lastChainWord = chainWords[chainWords.length - 1]?.word || "";
  const requiredLetter = lastChainWord ? lastChainWord[lastChainWord.length - 1].toUpperCase() : "";

  const handleSpeedGuess = () => {
    const g = guess.trim().toLowerCase();
    if (!g) return;

    const lastLetter = lastChainWord[lastChainWord.length - 1];

    // Validate: starts with last letter
    if (g[0] !== lastLetter) {
      showFeedback("wrong", `Must start with "${lastLetter.toUpperCase()}"!`);
      setGuess("");
      return;
    }

    // Check if already used
    if (chainWords.some(cw => cw.word === g)) {
      showFeedback("wrong", "Already used!");
      setGuess("");
      return;
    }

    // [TOPIC ENFORCEMENT]: Must be in the AI-generated valid word list
    const isValid = currentCategory.validWords.some(vw => vw.toLowerCase() === g);
    if (!isValid) {
      showFeedback("wrong", `"${g.toUpperCase()}" is not in ${currentCategory.name}!`);
      setGuess("");
      return;
    }

    // Valid word — add to chain
    setChainWords(prev => [...prev, { word: g, teamId: currentTeam.id, teamColor: currentColor }]);
    updateTeamScore(currentTeam.id, 100);
    showFeedback("correct", "+100!");

    // Next team's turn
    setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setGuess("");
    setTimeout(() => guessRef.current?.focus(), 100);
  };

  const handleSpeedWrong = () => {
    // Strike
    const newStrikes = { ...strikes };
    const teamId = currentTeam.id;
    newStrikes[teamId] = (newStrikes[teamId] || 0) + 1;
    setStrikes(newStrikes);

    if (newStrikes[teamId] >= 3) {
      // 3 strikes = huge penalty
      updateTeamScore(teamId, -500);
      showFeedback("wrong", "-500! 3 STRIKES!");
      newStrikes[teamId] = 0; // Reset strikes after penalty
      setStrikes(newStrikes);
    } else {
      showFeedback("wrong", `Strike ${newStrikes[teamId]}!`);
    }

    // Next team
    setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setGuess("");
  };

  const skipCategory = () => {
    setTimerActive(false);
    if (catIndex + 1 < categories.length) {
      setCatIndex(catIndex + 1);
      initSpeed(categories[catIndex + 1]);
      setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
      setStrikes(Object.fromEntries(currentTeams.map(t => [t.id, 0])));
    } else {
      setGameState("FINISHED");
    }
  };

  // ── Shared helpers ──
  const showFeedback = (type: "correct" | "wrong" | "hint", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), type === "hint" ? 2000 : 1200);
  };

  const handleSubmit = () => {
    if (gameMode === "puzzle") handlePuzzleGuess();
    else handleSpeedGuess();
  };

  // Drawer Settings
  const settings = [
    {
      label: "Topic / Subject",
      type: "select" as const, // Changed to select for simplicity in the drawer, or I can add a text input if I modify the drawer, but I'll stick to select/text pattern
      value: topic,
      onChange: setTopic,
      options: [
        { value: "", label: "-- Select Topic --" },
        { value: "Animals", label: "Animals" },
        { value: "Food & Drinks", label: "Food & Drinks" },
        { value: "Nature & Environment", label: "Nature" },
        { value: "Science & Technology", label: "Science/Tech" },
        { value: "Daily Life", label: "Daily Life" },
        { value: "Sports & Hobbies", label: "Sports" },
        { value: "Custom", label: "Custom (Type below)" }
      ],
      description: "Base theme for word generation"
    },
    {
      label: "Game Mode",
      type: "select" as const,
      value: gameMode,
      onChange: setGameMode,
      options: [
        { value: "puzzle", label: "🧩 Compound Puzzle" },
        { value: "speed", label: "⚡ Speed Chain" }
      ],
      description: "Puzzle: Word math. Speed: Last-letter race."
    },
    {
      label: "Difficulty Level",
      type: "select" as const,
      value: difficulty,
      onChange: setDifficulty,
      options: [
        { value: "Beginner", label: "A1-A2 Beginner" },
        { value: "Intermediate", label: "B1-B2 Intermediate" },
        { value: "Advanced", label: "Fluent Speakers" }
      ]
    },
    {
      label: "Circles per Chain",
      type: "select" as const,
      value: circlesPerChain,
      onChange: setCirclesPerChain,
      options: [
        { value: "4", label: "4 Circles" },
        { value: "5", label: "5 Circles" },
        { value: "6", label: "6 Circles" },
        { value: "7", label: "7 Circles" },
        { value: "random", label: "Varying (4-7)" }
      ],
      description: "How many words in each puzzle chain"
    },
    {
      label: "Rounds per Game",
      type: "select" as const,
      value: roundCount,
      onChange: setRoundCount,
      options: [
        { value: 4, label: "4 Rounds" },
        { value: 5, label: "5 Rounds" },
        { value: 6, label: "6 Rounds" },
        { value: 7, label: "7 Rounds" }
      ]
    },
    {
      label: "Turn Timer",
      type: "select" as const,
      value: timerDuration,
      onChange: setTimerDuration,
      options: [
        { value: 8, label: "8 Seconds" },
        { value: 10, label: "10 Seconds" },
        { value: 15, label: "15 Seconds" },
        { value: 20, label: "20 Seconds" },
        { value: 30, label: "30 Seconds" }
      ]
    }
  ];

  // ── Render ──
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games" className={styles.iconBtn}>
            <ArrowLeft size={20} color="#ff8c00" />
          </Link>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={{ margin: 0, color: '#ff8c00', fontSize: '1.2rem', letterSpacing: '0.1em', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link2 size={20} /> CHAIN_REACTION_v2.1
            </h1>
            <span style={{ fontSize: '0.6rem', opacity: 0.5, fontFamily: 'monospace' }}>SECURE_CONNECTION: ENCRYPTED // LINK_STATUS: ACTIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <MultiplayerHost gameMode="chainreaction" />
          <GameSettingsDrawer settings={settings} title="REACTION SETTINGS" />
        </div>
      </header>


      {/* ── SETUP ── */}
      {gameState === "SETUP" && (
        <div className={styles.setupContainer}>
          <div className={styles.setupPanel} style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: '#ff8c00', fontSize: '2rem', marginBottom: '0.5rem' }}>READY TO INITIALIZE?</h2>
              <p style={{ opacity: 0.7 }}>Configure your chain settings in the sidebar, then type a topic below to start.</p>
            </div>

            <input
              className={styles.input}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter Topic (e.g. Science, Travel, Space...)"
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              autoFocus
            />

            <button className={styles.btn} onClick={handleGenerate} disabled={!topic} style={{ marginTop: '1rem', background: topic ? '#ff8c00' : 'rgba(255,140,0,0.2)' }}>
              <Sparkles size={20} style={{ marginRight: "0.5rem" }} /> {gameMode === 'puzzle' ? 'FORGE CHAINS' : 'IGNITE SPEED CHAIN'}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.4 }}>
              Difficulty: {difficulty} | Rounds: {roundCount} | Length: {circlesPerChain}
            </p>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {gameState === "LOADING" && (
        <div className={styles.setupContainer}>
          <Loader2 size={64} className={styles.spin} style={{ color: "#00CED1" }} />
          <h2>{gameMode === "puzzle" ? "Forging compound word chains..." : "Building vocabulary categories..."}</h2>
        </div>
      )}

      {/* ── PLAYING: Chain Puzzle ── */}
      {gameState === "PLAYING" && gameMode === "puzzle" && currentChain && (
        <div className={styles.chainArea}>
          <div className={styles.chainMeta}>
            Chain {chainIndex + 1} of {chains.length} • {currentChain.difficulty || difficulty} Level
          </div>

          <div className={styles.timerGiant}>
            <GameTimer variant="circle" label="" timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={false} />
          </div>

          {/* Chain nodes */}
          <div className={styles.chainTrack}>
            {currentChain.words.map((word, i) => {
              const isRevealed = revealedWords[i];
              const isActive = i === activeWordIdx;
              const hints = hintLetters[i];
              const blanks = getWordBlanks(word, hints);
              const pts = getPointsForWord(hints);

              // Connection label between nodes
              const showConnection = isRevealed && i > 0 && revealedWords[i - 1] && currentChain.connections;
              
              return (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div className={`${styles.chainLink} ${revealedWords[i - 1] && isRevealed ? styles.chainLinkRevealed : ""}`}>
                      {showConnection && currentChain.connections?.[i - 1] && (
                        <span className={styles.connectionLabel}>{currentChain.connections[i - 1]}</span>
                      )}
                    </div>
                  )}
                  <div className={styles.chainNode}>
                    <div className={`${styles.nodeCircle} ${isRevealed ? styles.nodeRevealed : ""} ${isActive ? styles.nodeActive : ""}`}>
                      {isRevealed ? word.toUpperCase() : "?"}
                    </div>
                    {!isRevealed && (
                      <div className={styles.letterBlanks}>
                        {blanks.map((ch, j) => (
                          <span key={j} className={ch !== "_" ? styles.letterRevealed : ""}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    )}
                    {!isRevealed && isActive && (
                      <div className={styles.pointsBadge}>{pts} pts</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn + Input */}
          <div className={styles.guessArea}>
            <div className={styles.turnBadge} style={{ borderColor: currentColor, color: currentColor }}>
              {currentTeam.name}&apos;s Turn
            </div>
            <div className={styles.guessRow}>
              <input
                ref={guessRef}
                className={styles.guessInput}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder={`Type your guess...`}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
              <button className={styles.checkBtn} onClick={handleSubmit}>CHECK</button>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controlRow}>
            <button className={styles.controlBtn} onClick={skipChain}>
              <SkipForward size={16} style={{ marginRight: "0.3rem" }} /> Skip Chain
            </button>
            <button className={styles.controlBtn} onClick={() => handlePuzzleWrong()}>
              Pass Turn
            </button>
          </div>
        </div>
      )}

      {/* ── PLAYING: Speed Chain ── */}
      {gameState === "PLAYING" && gameMode === "speed" && currentCategory && (
        <div className={styles.speedArea}>
          <div className={styles.categoryBadge}>
            📂 {currentCategory.name}
            <span style={{ fontSize: "0.8rem", opacity: 0.5, marginLeft: "0.75rem" }}>
              Round {catIndex + 1} of {categories.length}
            </span>
          </div>

          <div className={styles.timerGiant}>
            <GameTimer variant="circle" label="" timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={false} />
          </div>

          {/* Word chain */}
          <div className={styles.wordChain}>
            {chainWords.map((cw, i) => (
              <div 
                key={i} 
                className={`${styles.wordBubble} ${i === chainWords.length - 1 ? styles.wordBubbleLatest : ""}`}
                style={cw.teamColor ? { borderColor: cw.teamColor, color: cw.teamColor } : {}}
              >
                {cw.word}
                {i === chainWords.length - 1 && (
                  <span className={styles.lastLetter}>
                    {cw.word[cw.word.length - 1].toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFD700" }}>
            Next word must start with: <span style={{ fontSize: "2.5rem" }}>{requiredLetter}</span>
          </div>

          {/* Strikes */}
          <div className={styles.strikeRow}>
            {currentTeams.map((t, i) => (
              <div key={t.id} className={styles.strikeCard} style={{ borderColor: t.id === currentTeam.id ? TEAM_COLORS[i % TEAM_COLORS.length] : "var(--panel-border)" }}>
                <div style={{ fontWeight: 700, color: TEAM_COLORS[i % TEAM_COLORS.length] }}>{t.name}</div>
                <div className={styles.strikes}>
                  {Array(3).fill(0).map((_, j) => (
                    <span key={j} style={{ color: j < (strikes[t.id] || 0) ? "#ef4444" : "rgba(255,255,255,0.15)" }}>✕</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Turn + Input */}
          <div className={styles.guessArea}>
            <div className={styles.turnBadge} style={{ borderColor: currentColor, color: currentColor }}>
              {currentTeam.name}&apos;s Turn
            </div>
            <div className={styles.guessRow}>
              <input
                ref={guessRef}
                className={styles.guessInput}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder={`Word starting with "${requiredLetter}"...`}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
              <button className={styles.checkBtn} onClick={handleSubmit}>GO</button>
            </div>
            <button className={styles.controlBtn} onClick={() => { handleSpeedWrong(); }} style={{ marginTop: "0.5rem" }}>
              Pass (Strike)
            </button>
          </div>

          {/* Controls */}
          <div className={styles.controlRow}>
            <button className={styles.controlBtn} onClick={skipCategory}>
              <SkipForward size={16} style={{ marginRight: "0.3rem" }} /> Next Category
            </button>
          </div>
        </div>
      )}

      {/* ── FINISHED ── */}
      {gameState === "FINISHED" && (
        <div className={styles.setupContainer}>
          <h1 style={{ fontSize: "3.5rem", color: "#00CED1" }}>🔗 Game Over!</h1>
          <p style={{ fontSize: "1.3rem", opacity: 0.7 }}>
            {gameMode === "puzzle" 
              ? `${chains.length} chains completed!` 
              : `${chainWords.length} words chained across ${catIndex + 1} categories!`}
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button className={styles.btn} onClick={() => {
              setGameState("SETUP");
              setChains([]);
              setCategories([]);
            }}>
              Play Again
            </button>
            <Link href="/games" style={{ textDecoration: "none" }}>
              <button className={styles.controlBtn} style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}>
                Back to Arcade
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Feedback Overlay ── */}
      {feedback && (
        <div className={feedback.type === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {feedback.text}
        </div>
      )}

      {/* ── Overlays ── */}
      {showTimesUp && <GameTimer showTimesUp={true} />}
      <ScoreboardOverlay />
    </div>
  );
}
