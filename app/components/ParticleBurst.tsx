"use client";

import React, { useEffect, useRef } from "react";

interface ParticleBurstProps {
  active: boolean;
  color?: string;
  onComplete?: () => void;
}

export default function ParticleBurst({ active, color = "#00FFD5", onComplete }: ParticleBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particleCount = 45;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = [color, "#00D1FF", "#BEEF00", "#FF4D8F", "#FFFFFF"];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5);
      const speed = Math.random() * 8 + 3;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.8, // burst from near bottom scoreboard
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4, // slight upward bias
        radius: Math.random() * 4 + 2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach((p) => {
        if (p.alpha <= 0) return;
        aliveCount++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (aliveCount > 0) {
        animId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, color, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
