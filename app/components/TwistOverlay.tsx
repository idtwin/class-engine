"use client";

import { useClassroomStore } from "../store/useClassroomStore";
import styles from "./TwistOverlay.module.css";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

export default function TwistOverlay() {
  const { twistVisible, currentTwist, closeTwist } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted || !twistVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <Zap size={80} className={styles.icon} />
        </div>
        <h1>TWIST!</h1>
        <p className={styles.twistText}>{currentTwist}</p>
        <button onClick={closeTwist} className={styles.closeBtn}>
          Got it
        </button>
      </div>
    </div>
  );
}
