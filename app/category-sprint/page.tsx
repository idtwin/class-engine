"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import { soundEngine } from "../utils/soundEngine";
import UniversalScoreboardHUD from "../components/HUD/UniversalScoreboardHUD";
import { useLiveRoomHost } from "@/app/lib/useLiveRoomHost";
import FloatingReactionsOverlay from "../components/FloatingReactionsOverlay";

interface CategoryItem {
  id: string;
  category: string;
  count: number;
  difficulty: "Easy" | "Medium" | "Hard";
  sampleAnswers: string[];
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "c1", category: "Animals", count: 3, difficulty: "Easy", sampleAnswers: ["Dog", "Cat", "Lion"] },
  { id: "c2", category: "Oceans", count: 3, difficulty: "Medium", sampleAnswers: ["Pacific", "Atlantic", "Indian"] },
  { id: "c3", category: "Cities in Europe", count: 3, difficulty: "Hard", sampleAnswers: ["Paris", "London", "Rome"] },
  { id: "c4", category: "Fruits", count: 4, difficulty: "Easy", sampleAnswers: ["Apple", "Banana", "Orange", "Grape"] },
  { id: "c5", category: "Action Verbs", count: 3, difficulty: "Easy", sampleAnswers: ["Run", "Jump", "Swim"] },
  { id: "c6", category: "Countries in Asia", count: 4, difficulty: "Medium", sampleAnswers: ["Indonesia", "Japan", "Korea", "India"] },
  { id: "c7", category: "Things in a Kitchen", count: 4, difficulty: "Easy", sampleAnswers: ["Spoon", "Fork", "Knife", "Plate"] },
  { id: "c8", category: "Irregular Past Tense Verbs", count: 3, difficulty: "Hard", sampleAnswers: ["Went", "Ate", "Saw"] },
  { id: "c9", category: "Sports Played with a Ball", count: 4, difficulty: "Easy", sampleAnswers: ["Soccer", "Basketball", "Tennis", "Volleyball"] },
  { id: "c10", category: "Musical Instruments", count: 3, difficulty: "Medium", sampleAnswers: ["Guitar", "Piano", "Drums"] },
  { id: "c11", category: "Colors of the Rainbow", count: 5, difficulty: "Easy", sampleAnswers: ["Red", "Orange", "Yellow", "Green", "Blue"] },
  { id: "c12", category: "Types of Weather", count: 4, difficulty: "Easy", sampleAnswers: ["Sunny", "Rainy", "Windy", "Snowy"] },
  { id: "c13", category: "Subjects Taught in High School", count: 4, difficulty: "Easy", sampleAnswers: ["English", "Math", "Physics", "History"] },
  { id: "c14", category: "Famous Tech Brands", count: 3, difficulty: "Medium", sampleAnswers: ["Apple", "Google", "Microsoft"] },
  { id: "c15", category: "Things You Wear in Winter", count: 3, difficulty: "Medium", sampleAnswers: ["Jacket", "Scarf", "Gloves"] },
  { id: "c16", category: "Prepositions of Place", count: 4, difficulty: "Medium", sampleAnswers: ["In", "On", "Under", "Behind"] },
  { id: "c17", category: "Capital Cities", count: 4, difficulty: "Hard", sampleAnswers: ["Jakarta", "Tokyo", "Canberra", "Ottawa"] },
  { id: "c18", category: "Adjectives Describing Emotions", count: 4, difficulty: "Medium", sampleAnswers: ["Happy", "Anxious", "Excited", "Gloomy"] },
  { id: "c19", category: "Things with Wheels", count: 5, difficulty: "Medium", sampleAnswers: ["Car", "Bicycle", "Bus", "Skateboard", "Train"] },
  { id: "c20", category: "Words Starting with 'UN-'", count: 3, difficulty: "Hard", sampleAnswers: ["Unhappy", "Unbelievable", "Unlocking"] },
];

export default function CategorySprintPage() {
  const { setQuestion, reactions, roomState } = useLiveRoomHost("categorysprint");
  const router = useRouter();
  const { soundEnabled, getActiveApiKey, llmProvider, mistralModel } = useClassroomStore();

  const [mounted, setMounted] = useState(false);
  const [deck, setDeck] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

  // Settings
  const [targetCountSetting, setTargetCountSetting] = useState<"random" | "3" | "4" | "5">("random");
  const [timerSetting, setTimerSetting] = useState<number>(30); // in seconds, 0 = off
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerActive, setTimerActive] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all");

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter deck based on difficulty and target count setting
  const filteredDeck = deck.filter((item) => {
    if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter) return false;
    if (targetCountSetting !== "random" && item.count !== parseInt(targetCountSetting)) return false;
    return true;
  });

  const activeCategory = filteredDeck[currentIndex % (filteredDeck.length || 1)] || deck[0];

  useEffect(() => {
    if (activeCategory) {
      setQuestion({
        category: activeCategory.category,
        count: activeCategory.count,
        difficulty: activeCategory.difficulty,
      });
    }
  }, [activeCategory, setQuestion]);

  // Reset timer on category change
  const resetTimer = useCallback(() => {
    setTimeLeft(timerSetting);
    setTimerActive(timerSetting > 0);
  }, [timerSetting]);

  useEffect(() => {
    resetTimer();
    setShowAnswers(false);
  }, [currentIndex, resetTimer]);

  // Timer countdown interval
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          soundEngine.playBuzzer(soundEnabled);
          setTimerActive(false);
          return 0;
        }
        if (prev <= 4) {
          soundEngine.playTimerTick(soundEnabled);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, soundEnabled]);

  const handleNext = useCallback(() => {
    soundEngine.playClick(soundEnabled);
    if (filteredDeck.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % filteredDeck.length);
    }
  }, [filteredDeck.length, soundEnabled]);

  // Spacebar shortcut to advance category
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || showAIModal) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, showSettings, showAIModal]);

  // AI Category Generation
  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    soundEngine.playClick(soundEnabled);

    try {
      const res = await fetch("/api/generate-category-sprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          provider: llmProvider,
          mistralModel,
          topic: aiTopic,
          count: 10,
        }),
      });

      const data = await res.json();
      if (data.categories && Array.isArray(data.categories)) {
        soundEngine.playSuccess(soundEnabled);
        setDeck(data.categories);
        setCurrentIndex(0);
        setShowAIModal(false);
        setAiTopic("");
      } else {
        alert(data.error || "Failed to generate categories.");
      }
    } catch (err: any) {
      alert("Error generating categories: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mounted) return null;

  const difficultyColor =
    activeCategory?.difficulty === "Easy"
      ? "var(--green)"
      : activeCategory?.difficulty === "Medium"
        ? "var(--orange)"
        : "var(--pink)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", paddingBottom: "100px", display: "flex", flexDirection: "column" }}>
      {/* TOP GAME BAR */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            soundEngine.playClick(soundEnabled);
            router.push("/activities");
          }}
          style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Tools
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              setShowAIModal(true);
            }}
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            ✨ AI Custom Deck
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              soundEngine.playClick(soundEnabled);
              setShowSettings(true);
            }}
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* MAIN PROJECTOR BOARD */}
      <div style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* CATEGORY CARD */}
        <div
          className="studio-card"
          style={{
            width: "100%",
            padding: "48px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "28px",
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            borderRadius: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* TOP TAGS / BADGES */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#000",
                background: "var(--yellow)",
                padding: "6px 16px",
                borderRadius: "20px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              🎯 NAME {activeCategory?.count || 3}!
            </span>

            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: difficultyColor,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${difficultyColor}`,
                padding: "6px 16px",
                borderRadius: "20px",
                textTransform: "uppercase",
              }}
            >
              {activeCategory?.difficulty || "Easy"}
            </span>

            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
              Card {((currentIndex) % (filteredDeck.length || 1)) + 1} of {filteredDeck.length || 1}
            </span>
          </div>

          {/* GIANT CATEGORY TEXT */}
          <div style={{ margin: "16px 0" }}>
            <h1
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 900,
                color: "var(--text-bright)",
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                textShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              "{activeCategory?.category}"
            </h1>
          </div>

          {/* TIMER DISPLAY */}
          {timerSetting > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  color: timeLeft <= 5 ? "var(--pink)" : "var(--cyan)",
                  background: "var(--surface2)",
                  border: `2px solid ${timeLeft <= 5 ? "var(--pink)" : "var(--border)"}`,
                  padding: "8px 24px",
                  borderRadius: "16px",
                  minWidth: "120px",
                }}
              >
                ⏱️ {timeLeft}s
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setTimerActive(!timerActive)}
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                {timerActive ? "⏸ Pause" : "▶ Start"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={resetTimer}
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                🔄 Reset
              </button>
            </div>
          )}

          {/* SAMPLE ANSWERS SECTION */}
          <div style={{ marginTop: "12px", width: "100%", maxWidth: "600px" }}>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              style={{
                background: "transparent",
                border: "1px dashed var(--muted)",
                color: "var(--muted)",
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {showAnswers ? "🙈 Hide Sample Answers" : "👁️ Show Teacher Sample Answers"}
            </button>

            {showAnswers && activeCategory?.sampleAnswers && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "16px",
                  background: "var(--surface2)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {activeCategory.sampleAnswers.map((ans, i) => (
                  <span
                    key={i}
                    style={{
                      background: "rgba(0, 238, 122, 0.1)",
                      border: "1px solid rgba(0, 238, 122, 0.3)",
                      color: "var(--green)",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    ✓ {ans}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div style={{ marginTop: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            style={{ padding: "16px 40px", fontSize: "18px", fontWeight: 800, borderRadius: "14px" }}
          >
            NEXT CATEGORY (SPACE) →
          </button>
        </div>
      </div>

      {/* GAME SETTINGS MODAL */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
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
            style={{ width: "100%", maxWidth: "480px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
              ⚙️ Category Sprint Settings
            </h2>

            {/* TARGET COUNT SETTING */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                Target Count (3–5 Items)
              </label>
              <select
                style={{ width: "100%", padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-bright)", borderRadius: "8px" }}
                value={targetCountSetting}
                onChange={(e) => setTargetCountSetting(e.target.value as any)}
              >
                <option value="random">Random (3, 4, or 5)</option>
                <option value="3">Lock to 3 Items</option>
                <option value="4">Lock to 4 Items</option>
                <option value="5">Lock to 5 Items</option>
              </select>
            </div>

            {/* TIMER DURATION SETTING */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                Countdown Timer
              </label>
              <select
                style={{ width: "100%", padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-bright)", borderRadius: "8px" }}
                value={timerSetting}
                onChange={(e) => setTimerSetting(parseInt(e.target.value))}
              >
                <option value={15}>15 Seconds (Rapid)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={45}>45 Seconds (Relaxed)</option>
                <option value={60}>60 Seconds</option>
                <option value={0}>Timer Off</option>
              </select>
            </div>

            {/* DIFFICULTY FILTER */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                Difficulty Filter
              </label>
              <select
                style={{ width: "100%", padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-bright)", borderRadius: "8px" }}
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy Only</option>
                <option value="Medium">Medium Only</option>
                <option value="Hard">Hard Only</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: "12px", padding: "10px", fontSize: "14px" }}
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* AI GENERATOR MODAL */}
      {showAIModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAIModal(false)}
        >
          <div
            className="studio-card"
            style={{ width: "100%", maxWidth: "520px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-bright)", margin: 0 }}>
                ✨ AI Custom Category Generator
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                Generate 10 custom category cards tailored to your lesson topic
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                Lesson Topic or Theme
              </label>
              <input
                type="text"
                placeholder="e.g. Past Tense Verbs, Environmental Science, Food & Cooking"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                style={{ width: "100%", padding: "12px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-bright)", borderRadius: "8px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAIModal(false)}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiTopic.trim()}
              >
                {isGenerating ? "Generating..." : "✨ Generate Deck"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SCOREBOARD HUD */}
      <UniversalScoreboardHUD />

      {/* Real-time audience reactions overlay */}
      <FloatingReactionsOverlay reactions={reactions} />
    </div>
  );
}
