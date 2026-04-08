"use client";

import Link from "next/link";
import styles from "./games.module.css";
import { ArrowLeft, LayoutGrid, Zap, Image as ImageIcon, MessageSquare, BookOpen, Flame, HelpCircle, Wrench, Link2, Volume2, VolumeX } from "lucide-react";
import { useClassroomStore } from "../store/useClassroomStore";

export default function GamesHub() {
  const games = [
    {
      title: "Fix It",
      desc: "The ultimate grammatical heavy-lifter. Find the single error in the broken sentence before the other teams. Features Race, Auction, and Spot & Swap modes.",
      href: "/fix-it",
      icon: <Wrench size={28} />,
      color: "#F59E0B" 
    },
    {
      title: "Odd One Out",
      desc: "An AI-powered word classification game with Classic, Debate, and Elimination modes. Find the outlier!",
      href: "/odd-one-out",
      icon: <HelpCircle size={28} />,
      color: "#9370DB" 
    },
    {
      title: "Rapid Fire",
      desc: "Fast-paced buzzer game. The AI pre-generates 15-20 questions and auto-routes them to matching student levels when a team buzzes in.",
      href: "/rapid-fire",
      icon: <Flame size={28} />,
      color: "#ff4d4d" 
    },
    {
      title: "Jeopardy",
      desc: "The classic 5x5 board. AI dynamically generates categories, questions, and highly contextual visual aids based on your topic.",
      href: "/jeopardy",
      icon: <LayoutGrid size={28} />,
      color: "#FFD700" 
    },
    {
      title: "The Hot Seat",
      desc: "Fast-paced Taboo. One student faces the class, the team has 60 seconds to describe the massive word on the projector.",
      href: "/hotseat",
      icon: <Zap size={28} />,
      color: "#FF4500" 
    },
    {
      title: "Picture Reveal",
      desc: "Answer rapid-fire questions to slowly reveal a hidden AI-generated image tile by tile from a 4x4 grid.",
      href: "/reveal",
      icon: <ImageIcon size={28} />,
      color: "#1E90FF" 
    },
    {
      title: "Would You Rather",
      desc: "A massive split-screen debate generator forcing students to choose and argue completely bizarre scenarios.",
      href: "/wyr",
      icon: <MessageSquare size={28} />,
      color: "#FF1493" 
    },
    {
      title: "Story Chain",
      desc: "Improv speaking rules! The AI forces a wild story starter and 3 random nouns. Chain the story block before the timer ends!",
      href: "/story",
      icon: <BookOpen size={28} />,
      color: "#32CD32" 
    },
    {
      title: "Chain Reaction",
      desc: "Fill in compound word chains or race in a last-letter speed round. Letter hints reveal on wrong answers!",
      href: "/chain-reaction",
      icon: <Link2 size={28} />,
      color: "#00CED1" 
    }
  ];

  const { soundEnabled, setSoundEnabled } = useClassroomStore();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Classroom Arcade</h1>
        </div>
        
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className={styles.iconBtn}
          title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
          style={{ background: soundEnabled ? "rgba(45, 212, 191, 0.1)" : "rgba(239, 68, 68, 0.1)" }}
        >
          {soundEnabled ? <Volume2 size={22} color="#2dd4bf" /> : <VolumeX size={22} color="#ef4444" />}
        </button>
      </header>
      
      <div className={styles.grid}>
        {games.map(game => (
          <Link key={game.href} href={game.href} className={styles.gameCard}>
            <div className={styles.gameTitle} style={{ color: game.color }}>
              {game.icon} {game.title}
            </div>
            <p className={styles.gameDesc}>{game.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
