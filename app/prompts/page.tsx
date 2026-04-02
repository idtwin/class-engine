"use client";

import { useState, useEffect } from "react";
import styles from "./prompts.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, ThumbsUp, ThumbsDown, BatteryLow, Flame } from "lucide-react";

export default function PromptGenerator() {
  const [mounted, setMounted] = useState(false);
  const { classes, activeClassId, teacherFeedback, submitFeedback } = useClassroomStore();
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeClass = classes.find(c => c.id === activeClassId);

  const generatePrompts = () => {
    let level = "Mid";
    let energy = "Normal";
    
    if (activeClass && activeClass.students.length > 0) {
      const levels = { Low: 0, Mid: 0, High: 0 };
      const energies = { Passive: 0, Normal: 0, Active: 0 };
      activeClass.students.forEach(s => {
        levels[s.level]++;
        energies[s.energy]++;
      });
      level = Object.keys(levels).reduce((a, b) => levels[a as keyof typeof levels] > levels[b as keyof typeof levels] ? a : b);
      energy = Object.keys(energies).reduce((a, b) => energies[a as keyof typeof energies] > energies[b as keyof typeof energies] ? a : b);
    }

    const adjustedDifficulty = teacherFeedback.difficulty;
    const adjustedEnergy = teacherFeedback.energyBoost;

    let basePrompts = [
      "Describe your weekend in 3 sentences.",
      "If you could have any superpower, what would it be?",
      "What is your favorite food and why?",
      "Tell us about a movie you watched recently.",
      "If you had a million dollars, what would you buy first?",
      "What is the best place you have ever traveled to?"
    ];

    if (level === "Low" || adjustedDifficulty < 0) {
      basePrompts = [
        "What is your favorite color?",
        "Do you like apples or bananas?",
        "What time did you wake up today?",
        "Name 3 animals you like.",
        "What is the weather like today?"
      ];
    } else if (level === "High" || adjustedDifficulty > 0) {
      basePrompts = [
        "Argue for or against absolute free speech.",
        "How will artificial intelligence change the world in 10 years?",
        "What is the most significant historical event in your country?",
        "Describe a complex problem you solved recently.",
        "What are the ethical implications of cloning?"
      ];
    }

    if (energy === "Passive" || adjustedEnergy > 0) {
      basePrompts = basePrompts.map(p => "🔥 STAND UP AND ACT IT OUT: " + p);
    }

    setGeneratedPrompts(basePrompts);
    setFeedbackGiven(false);
  };

  const handleFeedback = (type: "Too easy" | "Too hard" | "Low energy" | "High engagement") => {
    submitFeedback(type);
    setFeedbackGiven(true);
  };

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Prompts & Lesson Gen</h1>
        </div>
        <button className={styles.generateBtn} onClick={generatePrompts}>
          <Sparkles /> Generate 
        </button>
      </header>

      <div className={styles.content}>
        {generatedPrompts.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>Click Generate to create custom speaking prompts based on your class profile.</p>
          </div>
        ) : (
          <div className={styles.promptsList}>
            {generatedPrompts.map((prompt, i) => (
              <div key={i} className={styles.promptCard}>
                <span className={styles.promptNumber}>{i + 1}</span>
                <p className={styles.promptText}>{prompt}</p>
              </div>
            ))}
          </div>
        )}

        {generatedPrompts.length > 0 && (
          <div className={styles.feedbackLoop}>
            <h3>How were these prompts?</h3>
            {feedbackGiven ? (
              <p className={styles.successMsg}>Feedback saved! Future generations will adjust.</p>
            ) : (
              <div className={styles.feedbackBtns}>
                <button onClick={() => handleFeedback("Too easy")}><ThumbsDown className={styles.iconRotated} /> Too Easy</button>
                <button onClick={() => handleFeedback("Too hard")}><ThumbsDown /> Too Hard</button>
                <button onClick={() => handleFeedback("Low energy")}><BatteryLow /> Needs Energy</button>
                <button onClick={() => handleFeedback("High engagement")}><Flame /> High Engagement</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
