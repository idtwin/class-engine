"use client";

import { useClassroomStore, Student } from "../store/useClassroomStore";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Dices, RotateCcw } from "lucide-react";
import styles from "./wheel.module.css";

export default function WheelPage() {
  const [mounted, setMounted] = useState(false);
  const { classes, activeClassId } = useClassroomStore();
  const activeClass = classes.find((c) => c.id === activeClassId);

  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (activeClass) {
      setAvailableStudents([...activeClass.students]);
    }
  }, [activeClass]);

  if (!mounted) return null;

  if (!activeClass || activeClass.students.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.homeBtn}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
        </header>
        <div className={styles.main}>
          <h1>No Class Selected or Empty Class</h1>
          <p>Please select a class with students from the Dashboard.</p>
        </div>
      </div>
    );
  }

  const numStudents = availableStudents.length;

  const spinWheelFixed = () => {
    if (numStudents === 0 || isSpinning) return;
    
    setIsSpinning(true);
    const winningIndex = Math.floor(Math.random() * numStudents);
    const winner = availableStudents[winningIndex];
    const sliceAngle = 360 / numStudents;
    
    const midAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const randomJitter = (Math.random() - 0.5) * (sliceAngle * 0.8);
    const angleToTop = 360 - midAngle + randomJitter;
    
    const extraSpins = 4 * 360; 
    const currentBase = Math.floor(rotation / 360) * 360; 
    const finalRotation = currentBase + extraSpins + angleToTop;

    const actualRotation = finalRotation > rotation ? finalRotation : finalRotation + 360;

    setRotation(actualRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedStudent(winner);
      setShowModal(true);
    }, 3000);
  };

  const handleKeep = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleRemove = () => {
    if (selectedStudent) {
      setAvailableStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
    }
    setShowModal(false);
    setSelectedStudent(null);
  };

  const resetWheel = () => {
    setAvailableStudents([...activeClass.students]);
    setRotation(0);
  };

  const createPieSlices = () => {
    if (numStudents === 0) return null;
    const colors = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#e67e22", "#1abc9c", "#34495e"];
    
    const sliceAngle = 360 / numStudents;
    const gradientParts = availableStudents.map((s, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;
      const color = colors[i % colors.length];
      return `${color} ${startAngle}deg ${endAngle}deg`;
    });
    
    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;
    const dynamicFontSize = numStudents > 30 ? '1.2rem' : numStudents > 15 ? '1.5rem' : '2rem';
    
    return (
      <div 
        className={styles.wheel} 
        style={{ 
          background: conicGradient,
          transform: `rotate(${rotation}deg)` 
        }}
      >
        {availableStudents.map((s, i) => {
          const midAngle = (i * sliceAngle) + (sliceAngle / 2);
          return (
            <div 
              key={s.id} 
              className={styles.segmentLabelContainer}
              style={{ transform: `rotate(${midAngle}deg)` }}
            >
              <div 
                className={styles.segmentLabel} 
                style={{ fontSize: dynamicFontSize }}
                title={s.name}
              >
                {s.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.homeBtn}>
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>
        <h2>Spin the Wheel ({availableStudents.length}/{activeClass.students.length})</h2>
        <div style={{ width: 100 }}></div> {/* spacer */}
      </header>
      
      <div className={styles.main}>
        {numStudents === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <h2>All students have been selected!</h2>
            <button onClick={resetWheel} className={styles.spinBtn} style={{ marginTop: '2rem', display: 'inline-flex' }}>
              <RotateCcw size={28} /> Reset Wheel
            </button>
          </div>
        ) : (
          <>
            <div className={styles.wheelBox}>
              <div className={styles.pointer}></div>
              {createPieSlices()}
            </div>

            <button 
              onClick={spinWheelFixed} 
              disabled={isSpinning || numStudents === 0}
              className={styles.spinBtn}
            >
              <Dices size={28} /> SPIN!
            </button>
            <button onClick={resetWheel} className={styles.resetBtn}>
              <RotateCcw size={16} /> Reset
            </button>
          </>
        )}
      </div>

      {showModal && selectedStudent && (
        <div className={styles.modalOverlay}>
          <h2 style={{ color: 'white', fontSize: '2rem', margin: 0 }}>Selected Student:</h2>
          <div className={styles.winnerName}>{selectedStudent.name}!</div>
          <div className={styles.actions}>
            <button onClick={handleRemove} className={styles.actionBtn}>
              Remove from Wheel
            </button>
            <button onClick={handleKeep} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
              Keep on Wheel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
