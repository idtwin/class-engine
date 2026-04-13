"use client";

import Link from "next/link";
import styles from "./games.module.css";
import { ArrowLeft, LayoutGrid, Zap, Image as ImageIcon, MessageSquare, BookOpen, Flame, HelpCircle, Wrench, Link2, Volume2, VolumeX, ChevronRight } from "lucide-react";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import BoardLibrary from "../components/BoardLibrary";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GamesHub() {
  const [mounted, setMounted] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const { soundEnabled, setSoundEnabled } = useClassroomStore();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const games = [
    {
      title: "Fix It",
      desc: "Find the single error in the broken sentence before the other teams. Features Race, Auction, and Spot & Swap modes.",
      href: "/fix-it",
      icon: <Wrench size={24} />,
      color: "#F59E0B" 
    },
    {
      title: "Odd One Out",
      desc: "AI-powered word classification. Classic, Debate, and Elimination modes. Find the outlier!",
      href: "/odd-one-out",
      icon: <HelpCircle size={24} />,
      color: "#BC13FE" 
    },
    {
      title: "Rapid Fire",
      desc: "Fast-paced buzzer game. AI pre-generates 15-20 questions routed by student level.",
      href: "/rapid-fire",
      icon: <Flame size={24} />,
      color: "#FF2D78" 
    },
    {
      title: "Jeopardy",
      desc: "The classic 5x5 board. AI dynamically generates categories and high-context visual aids.",
      href: "/jeopardy",
      icon: <LayoutGrid size={24} />,
      color: "#FFB800" 
    },
    {
      title: "The Hot Seat",
      desc: "Fast-paced Taboo. Describe the hidden word to the student facing away from the projector.",
      href: "/hotseat",
      icon: <Zap size={24} />,
      color: "#00FF41" 
    },
    {
      title: "Picture Reveal",
      desc: "Answer rapid-fire questions to reveal a hidden AI-generated image tile by tile.",
      href: "/reveal",
      icon: <ImageIcon size={24} />,
      color: "#00E5FF" 
    },
    {
      title: "Would You Rather",
      desc: "AI split-screen debate generator forcing students to argue bizarre scenarios.",
      href: "/wyr",
      icon: <MessageSquare size={24} />,
      color: "#FF1493" 
    },
    {
      title: "Story Chain",
      desc: "Improv rules! Chain the story blocks using AI-forced keywords before the timer ends.",
      href: "/story",
      icon: <BookOpen size={24} />,
      color: "#A8FF3E" 
    },
    {
      title: "Chain Reaction",
      desc: "Compound word chains or last-letter races. Letter hints reveal on wrong answers.",
      href: "/chain-reaction",
      icon: <Link2 size={24} />,
      color: "#00CED1" 
    }
  ];

  const handleLaunch = (href: string) => {
    setIsLaunching(true);
    setTimeout(() => {
      router.push(href);
    }, 400);
  };

  if (!mounted) return null;

  const handleLoadBoard = (board: SavedBoard) => {
    const href = board.gameType === 'jeopardy' ? '/jeopardy' : (board.gameType === 'oddoneout' ? '/odd-one-out' : `/${board.gameType}`);
    handleLaunch(href);
  };

  return (
    <div className={`${styles.container} ${isLaunching ? styles.launching : ''}`}>
      {/* Light Burst Overlay */}
      {isLaunching && <div className={styles.lightBurst} />}


      <div className={styles.header}>
        <div>
          <div className={styles.launchLabel}>SYSTEM_READY // SELECT_MODULE</div>
          <h2 className="neon" style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>ARCADE_COMMAND</h2>
        </div>
        <BoardLibrary onLoadBoard={handleLoadBoard} />
      </div>

      <div className={styles.grid}>
        {games.map((game, idx) => (
          <div 
            key={game.href} 
            onClick={() => handleLaunch(game.href)} 
            className={`${styles.gameCard} ${styles.fadeIn}`}
            style={{ 
              animationDelay: `${idx * 0.05}s`,
              // @ts-ignore
              '--card-color': game.color 
            } as any}
          >
            <div className={styles.gameTitle}>
               <div className={styles.iconCircle} style={{ color: game.color }}>
                 {game.icon}
               </div>
               {game.title}
            </div>
            <p className={styles.gameDesc}>{game.desc}</p>
            <div className={styles.cardFooter}>
               Initialize Module <ChevronRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
