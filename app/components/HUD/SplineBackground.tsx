'use client';

import React, { useState, useEffect } from 'react';

/**
 * SplineBackground (Iframe Edition)
 * Uses native CSS data particles with client-side hydration safety.
 */
function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 9999 + 1) * 10000;
  return x - Math.floor(x);
}

export default function SplineBackground({ 
  opacity = 0.25 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className="holographic-void"
      style={{
        position: 'fixed', 
        inset: 0, 
        zIndex: -5, 
        pointerEvents: 'none',
        opacity: opacity || 0.6,
        background: 'transparent',
        overflow: 'hidden',
        perspective: '1000px',
      }}
    >
      {/* Floating Data Particles (Client Hydrated Only) */}
      {mounted && [...Array(20)].map((_, i) => {
        const left = (pseudoRandom(i * 1.1) * 100).toFixed(2);
        const top = (pseudoRandom(i * 2.3) * 100).toFixed(2);
        const pOpacity = (pseudoRandom(i * 3.7) * 0.4).toFixed(2);
        const duration = (15 + pseudoRandom(i * 4.9) * 20).toFixed(2);
        const delay = (pseudoRandom(i * 5.3) * -20).toFixed(2);

        return (
          <div 
            key={i}
            className="data-particle"
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              background: 'var(--electric-mint)',
              borderRadius: '50%',
              left: `${left}%`,
              top: `${top}%`,
              boxShadow: '0 0 10px var(--electric-mint)',
              opacity: Number(pOpacity),
              animation: `float-particle ${duration}s infinite ease-in-out`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      {/* Vignette to blend edges */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 30%, var(--bg) 100%)',
          pointerEvents: 'none',
        }} 
      />

    </div>
  );
}
