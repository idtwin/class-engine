"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import styles from "../play.module.css";
import PlayerHUD from "@/app/components/PlayerHUD";

// Modular Controller Hooks & Primitives
import { useControllerSocket } from "./hooks/useControllerSocket";
import { triggerHaptic } from "./hooks/useHapticFeedback";
import { ControllerHeader } from "./components/ControllerHeader";
import { ReactionDrawer } from "./components/ReactionDrawer";
import { HapticBuzzer } from "./components/HapticBuzzer";

// Asymmetric Mode Pads
import { QuickChoicePad } from "./components/modes/QuickChoicePad";
import { WyrPad } from "./components/modes/WyrPad";
import { ChainReactionPad } from "./components/modes/ChainReactionPad";
import { PictureRevealPad } from "./components/modes/PictureRevealPad";
import { HotSeatPad } from "./components/modes/HotSeatPad";
import { WheelPad } from "./components/modes/WheelPad";
import { WordSurgePad } from "./components/modes/WordSurgePad";
import { CategorySprintPad } from "./components/modes/CategorySprintPad";
import { StoryChainPad } from "./components/modes/StoryChainPad";
import { JeopardyPad } from "./components/modes/JeopardyPad";

const GAME_LABELS: Record<string, { emoji: string; label: string; badgeColor: string; badgeBg: string }> = {
  fixit:         { emoji: "🟡", label: "Fix It",        badgeColor: "#ffc843", badgeBg: "rgba(255,200,67,0.12)" },
  oddoneout:     { emoji: "🔮", label: "Odd One Out",   badgeColor: "#b06eff", badgeBg: "rgba(176,110,255,0.12)" },
  rapidfire:     { emoji: "⚡", label: "Rapid Fire",    badgeColor: "#ff4d8f", badgeBg: "rgba(255,77,143,0.12)" },
  jeopardy:      { emoji: "⊞",  label: "Jeopardy",      badgeColor: "#00c8f0", badgeBg: "rgba(0,200,240,0.12)" },
  reveal:        { emoji: "🖼️", label: "Pic Reveal",    badgeColor: "#ff7d3b", badgeBg: "rgba(255,125,59,0.12)" },
  wyr:           { emoji: "💬", label: "Would U Rather", badgeColor: "#00e87a", badgeBg: "rgba(0,232,122,0.12)" },
  hotseat:       { emoji: "🔥", label: "Hot Seat",      badgeColor: "#ff7d3b", badgeBg: "rgba(255,125,59,0.12)" },
  wheel:         { emoji: "🎡", label: "Wheel",         badgeColor: "#00ffd5", badgeBg: "rgba(0,255,213,0.12)" },
  cargohunt:     { emoji: "📦", label: "Cargo Hunt",    badgeColor: "#ffc843", badgeBg: "rgba(255,200,67,0.12)" },
  story:         { emoji: "📖", label: "Story Chain",   badgeColor: "#00e87a", badgeBg: "rgba(0,232,122,0.12)" },
  chainreaction: { emoji: "🔗", label: "Chain Reaction", badgeColor: "#b06eff", badgeBg: "rgba(176,110,255,0.12)" },
  categorysprint:{ emoji: "🏃", label: "Category Sprint",badgeColor: "#00c8f0", badgeBg: "rgba(0,200,240,0.12)" },
  wordsurge:     { emoji: "⚡", label: "Word Surge",     badgeColor: "#ffc843", badgeBg: "rgba(255,200,67,0.12)" },
};

const TEAM_COLORS = [
  "#00e87a", "#00c8f0", "#ffc843",
  "#ff4d8f", "#b06eff", "#ff7d3b", "#e2e8f0",
];

export default function PlayPage() {
  const params = useParams();
  const code = (params?.code as string) || "";

  // 1. Decoupled Realtime Session Management
  const {
    studentId,
    studentName,
    room,
    isConnected,
    isReconnecting,
    latencyMs,
    sendAction,
  } = useControllerSocket(code);

  // 2. Local Controller States
  const [personalScore, setPersonalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timerDisplay, setTimerDisplay] = useState<string>("");
  const [lastQuestionId, setLastQuestionId] = useState("");
  const [hasActedCurrentRound, setHasActedCurrentRound] = useState(false);
  const [guessesUsed, setGuessesUsed] = useState(0);

  // 3. Team Assignment
  const myTeamInfo = useMemo(() => {
    if (!room?.teams || !studentName) return null;
    const team = room.teams.find(
      (t: any) =>
        t.name === studentName ||
        t.students?.some((s: any) => s.name === studentName)
    );
    if (!team) return null;
    const tIdx = room.teams.indexOf(team);
    return {
      id: team.id,
      name: team.name,
      color: team.color || TEAM_COLORS[tIdx % TEAM_COLORS.length],
      score: team.score || 0,
    };
  }, [room?.teams, studentName]);

  // Squad Rank
  const myRank = useMemo(() => {
    if (!room?.teams || !myTeamInfo) return undefined;
    const sorted = [...room.teams].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    const idx = sorted.findIndex((t: any) => t.id === myTeamInfo.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [room?.teams, myTeamInfo]);

  // 4. Timer Telemetry Sync
  useEffect(() => {
    if (!room?.questionStartTime || !room?.questionDuration) {
      setTimerDisplay("");
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - room.questionStartTime) / 1000;
      const left = Math.max(0, room.questionDuration - elapsed);
      setTimerDisplay(left > 0 ? Math.ceil(left).toString() : "0");
    }, 500);

    return () => clearInterval(interval);
  }, [room?.questionStartTime, room?.questionDuration]);

  // 5. Round Reset Detection
  useEffect(() => {
    if (!room?.currentQuestion) return;
    const qKey =
      room.currentQuestion.id ||
      room.currentQuestion.sentence ||
      room.currentQuestion.text ||
      JSON.stringify(room.currentQuestion);

    if (qKey !== lastQuestionId) {
      setLastQuestionId(qKey);
      setHasActedCurrentRound(false);
      setGuessesUsed(0);
      triggerHaptic("ping");
    }
  }, [room?.currentQuestion, lastQuestionId]);

  // Audience Reaction Dispatcher
  const handleReaction = async (reaction: "cheer" | "clap" | "boost" | "pass") => {
    await sendAction("audience_reaction", {
      reaction,
      teamId: myTeamInfo?.id,
      studentId,
      studentName: studentName || myTeamInfo?.name || "Operative",
    });
  };

  // ══════════════════════════════════════════════════
  // RENDER: Loading / Disconnected / Lobby States
  // ══════════════════════════════════════════════════

  if (!room && !isConnected) {
    return (
      <div className={styles.endScreen}>
        <div className={styles.spinner} />
        <div className={styles.endSub}>ESTABLISHING COMMAND BRIDGE LINK...</div>
      </div>
    );
  }

  if (room?.status === "ended") {
    return (
      <div className={styles.endScreen}>
        <div style={{ fontSize: 56 }}>🏁</div>
        <div className={styles.endTitle}>MISSION CONCLUDED</div>
        <div className={styles.endSub}>Personal Score: {personalScore} PTS · Streak: {streak}</div>
      </div>
    );
  }

  const rawGame = room?.gameMode || "unknown";
  const currentGame = rawGame.replace(/-/g, "").toLowerCase();
  const gameInfo = GAME_LABELS[currentGame] || {
    emoji: "🎮",
    label: currentGame.toUpperCase(),
    badgeColor: "#00ffd5",
    badgeBg: "rgba(0,255,213,0.12)",
  };

  // Only render static PlayerHUD lobby if there is genuinely no active game yet
  if (room?.status === "waiting" && (currentGame === "unknown" || currentGame === "lobby")) {
    return (
      <div className={styles.screen}>
        <ControllerHeader
          gameMode={currentGame}
          gameLabel="LOBBY"
          badgeColor="#00ffd5"
          badgeBg="rgba(0,255,213,0.12)"
          myTeam={myTeamInfo}
          myRank={myRank}
          studentId={studentId}
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          latencyMs={latencyMs}
        />
        <div style={{ flex: 1, padding: 12 }}>
          <PlayerHUD
            name={studentName || "Player"}
            xp={personalScore}
            accuracy={100}
            studentId={studentId}
          />
        </div>
        <ReactionDrawer onSendReaction={handleReaction} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // RENDER: Active Asymmetric Game Modes
  // ══════════════════════════════════════════════════

  return (
    <div className={styles.screen}>
      <ControllerHeader
        gameMode={currentGame}
        gameLabel={gameInfo.label}
        badgeColor={gameInfo.badgeColor}
        badgeBg={gameInfo.badgeBg}
        myTeam={myTeamInfo}
        myRank={myRank}
        timerDisplay={timerDisplay}
        studentId={studentId}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        latencyMs={latencyMs}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* MODE: Hot Seat Tactical Console */}
        {currentGame === "hotseat" && (
          <HotSeatPad
            currentWord={room?.currentQuestion?.word || "WAITING FOR WORD..."}
            forbiddenWords={room?.currentQuestion?.forbidden || []}
            currentIndex={room?.currentQuestion?.currentIndex || 1}
            totalWords={room?.currentQuestion?.totalWords || 1}
            onScore={async () => {
              await sendAction("hotseat_action", { subAction: "score", teamId: myTeamInfo?.id });
            }}
            onPass={async () => {
              await sendAction("hotseat_action", { subAction: "pass", teamId: myTeamInfo?.id });
            }}
            onTaboo={async () => {
              await sendAction("hotseat_action", { subAction: "taboo", teamId: myTeamInfo?.id });
            }}
            onBuzz={async () => {
              await sendAction("student_buzz", { teamId: myTeamInfo?.id });
            }}
          />
        )}

        {/* MODE: Wheel of Fortune Console */}
        {currentGame === "wheel" && (
          <WheelPad
            onSpin={async () => {
              await sendAction("wheel_spin", { teamId: myTeamInfo?.id });
            }}
            onSolve={async (guess) => {
              await sendAction("wheel_solve", { guess, teamId: myTeamInfo?.id });
            }}
          />
        )}

        {/* MODE: Would You Rather */}
        {currentGame === "wyr" && (
          <WyrPad
            optionA={room?.currentQuestion?.optionA || "OPTION ALPHA"}
            optionB={room?.currentQuestion?.optionB || "OPTION BRAVO"}
            votedOption={hasActedCurrentRound ? "A" : null}
            onVote={async (choice) => {
              setHasActedCurrentRound(true);
              await sendAction("student_vote", { vote: choice, studentId });
            }}
          />
        )}

        {/* MODE: Chain Reaction */}
        {currentGame === "chainreaction" && (
          <ChainReactionPad
            words={room?.chainState?.words || [
              { word: "START", revealed: [true, true, true, true, true], isGiven: true },
              { word: "READY", revealed: [true, false, false, false, false] }
            ]}
            currentWordIdx={room?.chainState?.currentWordIdx || 1}
            isMyTurn={room?.chainState ? room.chainState.currentTeamId === myTeamInfo?.id : true}
            currentTeamName={
              room?.teams?.find((t: any) => t.id === room?.chainState?.currentTeamId)?.name || myTeamInfo?.name || "TACTICAL SQUAD"
            }
            currentTeamColor={
              room?.teams?.find((t: any) => t.id === room?.chainState?.currentTeamId)?.color || myTeamInfo?.color || "#00c8f0"
            }
            onSubmitAnswer={async (ans) => {
              await sendAction("submit_chain_answer", {
                answer: ans,
                teamId: myTeamInfo?.id,
              });
            }}
          />
        )}

        {/* MODE: Picture Reveal */}
        {currentGame === "reveal" && (
          <PictureRevealPad
            tilesRevealed={room?.tilesRevealed || 0}
            openClue={room?.currentQuestion?.secretHint || room?.revealImageAnswer ? "Examine the board for patterns!" : "Examine projector screen for visual patterns."}
            guessesUsed={guessesUsed}
            maxGuesses={3}
            onDispatchGuess={async (guess) => {
              setGuessesUsed((prev) => prev + 1);
              await sendAction("submit_open_guess", {
                guess,
                teamId: myTeamInfo?.id,
                teamName: myTeamInfo?.name,
              });
            }}
          />
        )}

        {/* MODE: Odd One Out / Fix It / Rapid Fire (Quick Choice) */}
        {(currentGame === "oddoneout" || currentGame === "fixit" || currentGame === "rapidfire") && (
          <QuickChoicePad
            promptText={room?.currentQuestion?.text || room?.currentQuestion?.sentence || room?.currentQuestion?.brokenSentence || "IDENTIFY THE TARGET"}
            privateHint={room?.currentQuestion?.privateHint}
            options={
              room?.currentQuestion?.words?.map((w: string, i: number) => ({
                key: String.fromCharCode(65 + i),
                label: w,
              })) ||
              room?.currentQuestion?.options?.map((opt: string, i: number) => ({
                key: String.fromCharCode(65 + i),
                label: opt,
              })) || [
                { key: "A", label: "OPTION A" },
                { key: "B", label: "OPTION B" },
                { key: "C", label: "OPTION C" },
                { key: "D", label: "OPTION D" },
              ]
            }
            disabled={hasActedCurrentRound}
            onSelectOption={async (optKey) => {
              setHasActedCurrentRound(true);
              await sendAction("student_vote", { vote: optKey, studentId });
              await sendAction("student_answer", { answer: optKey, studentId, teamId: myTeamInfo?.id });
            }}
          />
        )}

        {/* MODE: Jeopardy Tactical Console */}
        {currentGame === "jeopardy" && (
          <JeopardyPad
            category={room?.currentQuestion?.category}
            points={room?.currentQuestion?.points}
            questionText={room?.currentQuestion?.text}
            isLockedOut={Boolean(room?.lockedOutTeamId && room?.lockedOutTeamId !== myTeamInfo?.id)}
            lockedOutBy={room?.teams?.find((t: any) => t.id === room?.lockedOutTeamId)?.name}
            teamColor={myTeamInfo?.color}
            onBuzz={async () => {
              await sendAction("student_buzz", { teamId: myTeamInfo?.id, studentName });
            }}
          />
        )}

        {/* MODE: Word Surge */}
        {currentGame === "wordsurge" && (
          <WordSurgePad
            scrambledWords={room?.currentQuestion?.scrambled || ["sentence", "tactical", "assemble", "the"]}
            hint={room?.currentQuestion?.hint || "Assemble the scrambled sentence in correct order"}
            currentIndex={room?.currentQuestion?.currentIndex || 1}
            totalPrompts={room?.currentQuestion?.totalPrompts || 1}
            onSubmitAnswer={async (sentence) => {
              await sendAction("word_surge_submit", {
                sentence,
                teamId: myTeamInfo?.id,
                studentId,
                studentName,
              });
              await sendAction("student_answer", {
                answer: sentence,
                studentId,
                teamId: myTeamInfo?.id,
              });
            }}
          />
        )}

        {/* MODE: Category Sprint */}
        {currentGame === "categorysprint" && (
          <CategorySprintPad
            category={room?.currentQuestion?.category || "CATEGORY SPRINT"}
            count={room?.currentQuestion?.count || 3}
            difficulty={room?.currentQuestion?.difficulty || "Medium"}
            onSendWord={async (word) => {
              await sendAction("category_sprint_word", {
                word,
                teamId: myTeamInfo?.id,
                studentName,
              });
              await sendAction("student_answer", {
                answer: word,
                studentId,
                teamId: myTeamInfo?.id,
              });
            }}
            onBuzz={async () => {
              await sendAction("student_buzz", { teamId: myTeamInfo?.id, studentName });
            }}
          />
        )}

        {/* MODE: Story Chain */}
        {currentGame === "story" && (
          <StoryChainPad
            starter={room?.currentQuestion?.starter || "Once upon a time in a tactical mission..."}
            currentWords={room?.currentQuestion?.currentWords || ["brave", "mystery", "signal"]}
            currentRound={room?.currentQuestion?.currentRound || 1}
            totalRounds={room?.currentQuestion?.totalRounds || 5}
            onWordUsed={async () => {
              await sendAction("story_word_used", {
                teamId: myTeamInfo?.id,
                studentId,
                studentName,
              });
            }}
            onSubmitLine={async (line) => {
              await sendAction("story_line_submit", {
                line,
                teamId: myTeamInfo?.id,
                studentId,
                studentName,
              });
            }}
          />
        )}

        {/* MODE: Buzzer Fallback (Cargo Hunt, Standby) */}
        {(currentGame === "cargohunt" || currentGame === "unknown") && (
          <HapticBuzzer
            isLockedOut={room?.lockedOutTeamId && room?.lockedOutTeamId !== myTeamInfo?.id}
            lockedOutBy={room?.teams?.find((t: any) => t.id === room?.lockedOutTeamId)?.name}
            teamColor={myTeamInfo?.color}
            onBuzz={async () => {
              await sendAction("student_buzz", { teamId: myTeamInfo?.id, studentName });
            }}
          />
        )}
      </main>

      {/* Real-time Audience Reaction Launcher */}
      <ReactionDrawer onSendReaction={handleReaction} />
    </div>
  );
}
