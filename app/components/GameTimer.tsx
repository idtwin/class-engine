"use client";

import styles from "./GameTimer.module.css";

interface GameTimerProps {
  timeLeft: number;
  totalTime: number;
  showTimesUp: boolean;
}

export default function GameTimer({ timeLeft, totalTime, showTimesUp }: GameTimerProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const offset = circumference * (1 - progress);

  const getColor = () => {
    if (timeLeft <= 5) return "#ff3333";
    if (timeLeft <= 10) return "#ffaa00";
    return "#2dd4bf";
  };

  if (showTimesUp) {
    return (
      <div className={styles.timesUpOverlay}>
        <div className={styles.timesUpContent}>
          <div className={styles.timesUpIcon}>⏰</div>
          <h1 className={styles.timesUpText}>TIME&apos;S UP!</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.timerContainer} ${timeLeft <= 5 ? styles.pulse : ""}`}>
      <svg className={styles.ring} viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className={styles.timerNumber} style={{ color: getColor() }}>
        {timeLeft}
      </div>
    </div>
  );
}
