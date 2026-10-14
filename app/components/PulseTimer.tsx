"use client";

import { useEffect, useState } from "react";

export default function PulseTimer({ 
  duration, 
  startTime, 
  active = true 
}: { 
  duration: number; 
  startTime: number | null; 
  active?: boolean;
}) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!startTime || !duration || !active) return;

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const rem = Math.max(0, duration - elapsed);
      setRemaining(rem);
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startTime, duration, active]);

  if (!active || remaining <= 0) return null;

  const isCritical = remaining <= 10;
  const isActive = remaining > 0;

  return (
    <div className={`pulse-container ${isActive ? 'pulse-active' : ''} ${isCritical ? 'pulse-critical' : ''}`}>
      <div className="pulse-border" />
      <div className="giant-clock">
        {Math.ceil(remaining)}
      </div>
    </div>
  );
}
