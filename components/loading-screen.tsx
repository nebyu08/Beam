'use client';

import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isReady: boolean;
  onFinished?: () => void;
}

export default function LoadingScreen({ isReady, onFinished }: LoadingScreenProps) {
  const [dotCount, setDotCount] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Animate dots one by one every 350ms
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 0 : prev + 1));
    }, 350);
    return () => clearInterval(interval);
  }, []);

  // Guarantee minimum dwell time of 1.4s so the dots complete at least one full cycle
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  // Safety timeout: ensure loading screen doesn't stay stuck longer than 4s under any condition
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 3500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // When both ready and minimum animation time have elapsed, trigger smooth fade out
  useEffect(() => {
    if ((isReady && minTimeElapsed) || (minTimeElapsed && !isReady)) {
      setIsFading(true);
      onFinished?.();
      const fadeTimer = setTimeout(() => {
        setIsDone(true);
      }, 700);
      return () => clearTimeout(fadeTimer);
    }
  }, [isReady, minTimeElapsed, onFinished]);

  if (isDone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060608] select-none transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Subtle ambient glow behind text */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Main "theres nothing to read" Title with Sequential Dots OUTSIDE the quotes */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white italic drop-shadow-2xl">
          <span>&ldquo;theres nothing to read&rdquo;</span>
          <span className="inline-flex tracking-wider not-italic text-emerald-400 font-mono pl-1.5">
            <span
              className={`inline-block transition-opacity duration-150 ${
                dotCount >= 1 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              .
            </span>
            <span
              className={`inline-block transition-opacity duration-150 ${
                dotCount >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              .
            </span>
            <span
              className={`inline-block transition-opacity duration-150 ${
                dotCount >= 3 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              .
            </span>
          </span>
        </h1>
      </div>
    </div>
  );
}
