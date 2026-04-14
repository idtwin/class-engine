"use client";

import { useState, useEffect } from "react";
import styles from "./prompts.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";

export default function PromptGenerator() {
  const [mounted, setMounted] = useState(false);
  const { getActiveApiKey, mistralModel, llmProvider } = useClassroomStore();
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [promptCount, setPromptCount] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => setMounted(true), []);

  const generatePrompts = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    
    

    setIsGenerating(true);
    setGeneratedPrompts([]);

    try {
      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel,
          provider: llmProvider,
          topic: topic.trim(),
          count: promptCount,
        }),
      });
      const data = await res.json();
      if (res.ok && data.prompts) {
        setGeneratedPrompts(data.prompts);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Speaking Prompts</h1>
        </div>
      </header>

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        <input
          placeholder="Topic (e.g. Travel, Food, Technology)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={styles.topicInput}
          onKeyDown={(e) => e.key === "Enter" && !isGenerating && generatePrompts()}
        />
        <select
          value={promptCount}
          onChange={(e) => setPromptCount(Number(e.target.value))}
          className={styles.countSelect}
        >
          {[3, 5, 6, 8, 10, 15, 20].map((n) => (
            <option key={n} value={n}>{n} prompts</option>
          ))}
        </select>
        <button
          className={styles.generateBtn}
          onClick={generatePrompts}
          disabled={isGenerating}
        >
          {generatedPrompts.length > 0 ? <RefreshCw size={20} /> : <Sparkles size={20} />}
          {isGenerating ? "Generating..." : generatedPrompts.length > 0 ? "Regenerate" : "Generate"}
        </button>
      </div>

      <div className={styles.content}>
        {isGenerating ? (
          <div className={styles.emptyState}>
            <Sparkles size={64} className={styles.spinIcon} />
            <p>AI is crafting your prompts...</p>
          </div>
        ) : generatedPrompts.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>Enter a topic above to generate AI-powered speaking prompts for your class.</p>
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
      </div>
    </div>
  );
}
