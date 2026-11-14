'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GeoBook } from '@/lib/geo-types';
import { PopOrigin } from '@/components/book-details-modal';
import {
  ArrowLeft,
  Sparkles,
  Compass,
  Zap,
} from 'lucide-react';

export type ViewMode = 'line' | 'fun';

// Subtle click/pulse sound for Fun Mode interactions
function playCassetteSound(type: 'click' | 'tape' | 'flip', muted = false) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'tape') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.05);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'flip') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  } catch {
    // audio failure silent guard
  }
}

interface CountryViewProps {
  country: {
    name: string;
    flag?: string;
    tagline?: string;
    books: GeoBook[];
  };
  keysActive?: boolean;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook, origin: PopOrigin) => void;
}

/* Subtle Warped 3D Wireframe Grid Background matching the Pinterest Line Mode reference */
function WarpedGridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full opacity-15"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grid-fade-x" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Horizontal undulating lines */}
        {Array.from({ length: 16 }, (_, i) => {
          const yPct = (i + 1) * 6.2;
          const curveOffset = Math.sin(i * 0.45) * 28;
          return (
            <path
              key={`h-${i}`}
              d={`M -40 ${yPct}% Q 55% ${yPct + curveOffset * 0.15}%, 105% ${yPct}%`}
              fill="none"
              stroke="url(#grid-fade-x)"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Vertical perspective lines */}
        {Array.from({ length: 24 }, (_, j) => {
          const xPct = (j + 1) * 4.2;
          const bend = Math.sin(j * 0.3) * 18;
          return (
            <path
              key={`v-${j}`}
              d={`M ${xPct}% -20 Q ${xPct + bend * 0.15}% 50%, ${xPct}% 105%`}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.1"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      {/* Atmospheric Radial Gradients */}
      <div className="absolute -top-40 -left-40 h-[680px] w-[680px] rounded-full bg-gradient-to-br from-amber-600/15 via-rose-950/10 to-transparent blur-[130px]" />
      <div className="absolute -bottom-40 right-0 h-[720px] w-[720px] rounded-full bg-gradient-to-tl from-indigo-950/20 via-amber-900/10 to-transparent blur-[140px]" />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90" />
    </div>
  );
}

export default function CountryView({
  country,
  keysActive = true,
  onBackToGlobe,
  onSelectBook,
}: CountryViewProps) {
  const books = country.books;
  const [viewMode, setViewMode] = useState<ViewMode>('line');
  const [failedCovers, setFailedCovers] = useState<Record<number, true>>({});
  const [viewWidth, setViewWidth] = useState(1200);

  // --- Line Mode State ---
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // --- Fun Mode Camera & Flight State ---
  const [funCamera, setFunCamera] = useState({ x: 0, y: 0, z: 0 });
  const [funFormation, setFunFormation] = useState<'free' | 'orbit' | 'vortex'>('free');
  const [isFunPulsing, setIsFunPulsing] = useState(false);
  const [isFunPanning, setIsFunPanning] = useState(false);
  const [hoveredFunId, setHoveredFunId] = useState<string | null>(null);
  const [funMouseParallax, setFunMouseParallax] = useState({ x: 0, y: 0 });
  const isPanningFunRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const panVelocityRef = useRef({ x: 0, y: 0 });
  const lastPanPosRef = useRef({ x: 0, y: 0, time: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastInteractTimeRef = useRef(0);

  // Repeat books in Line Mode so the 3D infinite ribbon is always lush and full
  const ribbonBooks = useMemo(() => {
    if (books.length === 0) return [];
    if (books.length >= 14) return books;
    const repeated: GeoBook[] = [];
    while (repeated.length < 18) repeated.push(...books);
    return repeated;
  }, [books]);

  // Floating Books Generation for Fun Mode (Zero-G Cosmic Constellation)
  const funBooks = useMemo(() => {
    if (books.length === 0) return [];
    const count = Math.max(18, Math.min(30, books.length * 2));
    const items = [];
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const book = books[i % books.length];
      const theta = (2 * Math.PI * i) / phi;
      const radiusX = 180 + i * 26;
      const radiusY = 130 + i * 18;

      const baseX = Math.cos(theta) * radiusX + Math.sin(i * 3.7) * 45;
      const baseY = Math.sin(theta) * radiusY + Math.cos(i * 2.3) * 45;
      const baseZ = -320 + ((i * 31) % 520); // depth between -320 and +200

      const baseRotX = -18 + ((i * 17) % 36);
      const baseRotY = -28 + ((i * 23) % 56);
      const baseRotZ = -12 + ((i * 11) % 24);

      const phase = (i * 1.3) % (Math.PI * 2);

      // Orbit preset parameters (dynamic ring)
      const orbitAngle = (i / count) * Math.PI * 2;
      const orbitRadius = 260 + (i % 3) * 90;
      const orbitY = ((i % 5) - 2) * 55;

      // Vortex preset parameters (helical funnel)
      const vortexAngle = i * 0.45;
      const vortexRadius = 90 + i * 16;
      const vortexY = (i - count / 2) * 36;
      const vortexZ = (i - count / 2) * 28;

      items.push({
        id: `fun-${book.id}-${i}`,
        book,
        index: i,
        baseX,
        baseY,
        baseZ,
        baseRotX,
        baseRotY,
        baseRotZ,
        phase,
        orbitAngle,
        orbitRadius,
        orbitY,
        vortexAngle,
        vortexRadius,
        vortexY,
        vortexZ,
      });
    }
    return items;
  }, [books]);

  // Measure container width
  useEffect(() => {
    lastInteractTimeRef.current = Date.now();
    const handleResize = () => {
      if (containerRef.current) {
        setViewWidth(containerRef.current.clientWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync scrollOffset ref
  useEffect(() => {
    scrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  // Surprise me random book - opens its details directly
  const handleSurpriseMe = useCallback(() => {
    if (books.length === 0) return;
    const random = books[Math.floor(Math.random() * books.length)];
    onSelectBook?.(random, {
      left: window.innerWidth / 2 - 100,
      top: window.innerHeight / 2 - 140,
      width: 200,
      height: 280,
    });
  }, [books, onSelectBook]);

  // --- Fun Mode Pulse Trigger ---
  const triggerFunPulse = useCallback(() => {
    playCassetteSound('tape', false);
    setIsFunPulsing(true);
    setTimeout(() => {
      setIsFunPulsing(false);
    }, 900);
  }, []);

  // --- Line Mode Auto-Drift ---
  useEffect(() => {
    if (viewMode !== 'line' || books.length === 0) return;

    let animId = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const idle = Date.now() - lastInteractTimeRef.current > 1200;
      if (idle && !isDraggingRef.current && hoveredIdx === null) {
        const driftSpeed = 24; // px per second
        setScrollOffset((curr) => {
          const next = curr + driftSpeed * dt;
          scrollOffsetRef.current = next;
          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [viewMode, books.length, hoveredIdx]);

  // --- Fun Mode Momentum Drift ---
  useEffect(() => {
    if (viewMode !== 'fun') return;
    let animId = 0;
    const tick = () => {
      if (!isPanningFunRef.current) {
        if (
          Math.abs(panVelocityRef.current.x) > 0.08 ||
          Math.abs(panVelocityRef.current.y) > 0.08
        ) {
          panVelocityRef.current.x *= 0.93;
          panVelocityRef.current.y *= 0.93;
          setFunCamera((prev) => ({
            ...prev,
            x: prev.x + panVelocityRef.current.x,
            y: prev.y + panVelocityRef.current.y,
          }));
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [viewMode]);

  // Pointer Dragging & Wheel Interactions for Line Mode
  useEffect(() => {
    if (viewMode !== 'line') return;
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('button')) return;
      isDown = true;
      isDraggingRef.current = true;
      startX = e.clientX;
      startScroll = scrollOffsetRef.current;
      hasDraggedRef.current = false;
      lastInteractTimeRef.current = Date.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) {
        hasDraggedRef.current = true;
      }
      const next = startScroll - dx * 1.35;
      scrollOffsetRef.current = next;
      setScrollOffset(next);
      lastInteractTimeRef.current = Date.now();
    };

    const onPointerUp = () => {
      if (!isDown) return;
      isDown = false;
      isDraggingRef.current = false;
      lastInteractTimeRef.current = Date.now();
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 50);
    };

    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const next = scrollOffsetRef.current + delta * 0.9;
      scrollOffsetRef.current = next;
      setScrollOffset(next);
      lastInteractTimeRef.current = Date.now();
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [viewMode]);

  // Keyboard navigation for both modes
  useEffect(() => {
    if (!keysActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'line') {
        if (e.key === 'ArrowRight') {
          setScrollOffset((c) => c + 140);
        } else if (e.key === 'ArrowLeft') {
          setScrollOffset((c) => c - 140);
        } else if (e.code === 'Space') {
          if (books.length > 0) {
            e.preventDefault();
            handleSurpriseMe();
          }
        }
      } else if (viewMode === 'fun') {
        // Fun Mode Flying & Traversal
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          setFunCamera((p) => ({ ...p, x: p.x + 90 }));
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          setFunCamera((p) => ({ ...p, x: p.x - 90 }));
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          setFunCamera((p) => ({ ...p, y: p.y - 90 }));
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          setFunCamera((p) => ({ ...p, y: p.y + 90 }));
        } else if (e.key === '=' || e.key === '+' || e.key === 'e' || e.key === 'E') {
          setFunCamera((p) => ({ ...p, z: Math.min(650, p.z + 90) }));
        } else if (e.key === '-' || e.key === '_' || e.key === 'q' || e.key === 'Q') {
          setFunCamera((p) => ({ ...p, z: Math.max(-400, p.z - 90) }));
        } else if (e.code === 'Space') {
          e.preventDefault();
          triggerFunPulse();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setFunCamera({ x: 0, y: 0, z: 0 });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    keysActive,
    viewMode,
    books,
    handleSurpriseMe,
    triggerFunPulse,
  ]);

  // --- Fun Mode Flight & Pan Handlers ---
  const handleFunPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    isPanningFunRef.current = true;
    setIsFunPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: funCamera.x,
      camY: funCamera.y,
    };
    lastPanPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    panVelocityRef.current = { x: 0, y: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleFunPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const nx = (e.clientX / Math.max(1, viewWidth) - 0.5) * 16;
    const ny = (e.clientY / Math.max(1, window.innerHeight || 800) - 0.5) * 14;
    setFunMouseParallax({ x: nx, y: -ny });

    if (!isPanningFunRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setFunCamera((prev) => ({
      ...prev,
      x: panStartRef.current.camX - dx,
      y: panStartRef.current.camY - dy,
    }));

    const now = performance.now();
    const dt = Math.max(1, now - lastPanPosRef.current.time);
    panVelocityRef.current = {
      x: ((lastPanPosRef.current.x - e.clientX) / dt) * 14,
      y: ((lastPanPosRef.current.y - e.clientY) / dt) * 14,
    };
    lastPanPosRef.current = { x: e.clientX, y: e.clientY, time: now };
  };

  const handleFunPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningFunRef.current) return;
    isPanningFunRef.current = false;
    setIsFunPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleFunWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomDelta = e.deltaY * -0.65;
    setFunCamera((prev) => ({
      ...prev,
      z: Math.max(-400, Math.min(650, prev.z + zoomDelta)),
    }));
  };

  // Handle clicking a book card to open its detail modal immediately
  const handleCardClick = (book: GeoBook, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (hasDraggedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSelectBook?.(book, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const isWide = viewWidth >= 1024;
  const isTablet = viewWidth >= 768;

  // 3D S-Curve Ribbon Calculations for Line Mode
  const cardSpacing = isWide ? 190 : isTablet ? 160 : 135;
  const totalRibbonLength = ribbonBooks.length * cardSpacing;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 overflow-hidden bg-[#09090b] text-white select-none touch-none"
    >
      {/* 3D Warped Wireframe Grid Background (Active in both modes) */}
      <WarpedGridBackground />

      {/* Top Header Bar */}
      <header className="relative z-30 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
        <div className="flex items-center gap-3">
          <BackToGlobeButton onClick={onBackToGlobe || (() => {})} />
        </div>

        {/* Center Minimal Branding or Title */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md">
          <Compass className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
            {viewMode === 'line' ? 'Literary Motion' : 'Zero-G Canon'}
          </span>
        </div>

        {/* Right Info, View Mode Switcher, and Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* View Mode Switcher: Line Mode vs Fun Mode */}
          <div className="flex items-center rounded-full bg-white/10 p-0.5 border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                viewMode === 'line'
                  ? 'bg-white text-black shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fun')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                viewMode === 'fun'
                  ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black shadow-md font-bold'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Fun</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSurpriseMe}
            className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-1.5 text-xs font-medium text-amber-200 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:rotate-12" />
            <span>Surprise me</span>
          </button>

          <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-zinc-300">
            {books.length} titles
          </span>
        </div>
      </header>

      {/* =========================================================================
          VIEW MODE 1: LINE MODE (3D S-Curve Infinite Reel from Pinterest Reference 1)
          ========================================================================= */}
      {viewMode === 'line' && (
        <div className="relative flex h-[calc(100vh-5rem)] w-full items-center">
          {/* 3D Infinite Ribbon of Floating Books */}
          <div
            className="absolute inset-0 z-10 overflow-hidden"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {ribbonBooks.map((book, index) => {
              const rawOffset = index * cardSpacing - scrollOffset;
              let relX = ((rawOffset % totalRibbonLength) + totalRibbonLength) % totalRibbonLength;
              if (relX > totalRibbonLength / 2) relX -= totalRibbonLength;

              const halfW = viewWidth * 0.52;
              const u = relX / halfW;

              if (Math.abs(u) > 1.35) return null;

              const curveZ = (1 - Math.abs(u)) * 110 - 50;
              const curveScale = Math.max(0.48, 1 - Math.abs(u) * 0.45);

              const waveY = Math.sin(u * Math.PI * 1.5) * (isWide ? 85 : 55);
              const scatterY = ((index % 3) - 1) * (isWide ? 40 : 25);
              const y = waveY + scatterY;

              const baseX = relX + (isWide ? viewWidth * 0.16 : 0);

              const rotY = -u * 22;
              const rotZ = Math.sin(u * Math.PI + (index % 4)) * 6;
              const opacity = Math.max(0.15, Math.min(1, 1 - Math.pow(Math.abs(u), 2.6)));

              const isHovered = hoveredIdx === index;
              const coverSrc = book.cover || book.cover_url;
              const coverFailed = !coverSrc || failedCovers[book.id];

              return (
                <button
                  type="button"
                  aria-label={`View details for ${book.title} by ${book.author}`}
                  key={`${book.id}-${index}`}
                  onMouseEnter={() => setHoveredIdx(index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={(e) => handleCardClick(book, e)}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate3d(${baseX}px, ${y}px, ${
                      isHovered ? curveZ + 80 : curveZ
                    }px) scale(${isHovered ? curveScale * 1.16 : curveScale}) rotateY(${
                      isHovered ? 0 : rotY
                    }deg) rotateZ(${isHovered ? 0 : rotZ}deg)`,
                    opacity: opacity,
                    zIndex: isHovered ? 60 : Math.round((1 - Math.abs(u)) * 30),
                    transition: isHovered
                      ? 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.3s'
                      : 'opacity 0.4s',
                  }}
                  className="pointer-events-auto cursor-pointer group flex flex-col will-change-transform text-left focus:outline-none"
                >
                  {/* Book Card Volume Container */}
                  <div
                    className={`relative w-[130px] sm:w-[155px] lg:w-[175px] aspect-[2/3] rounded-[6px] overflow-hidden bg-[#241c17] transition-all duration-300 ${
                      isHovered
                        ? 'shadow-[0_25px_50px_-8px_rgba(0,0,0,0.95),0_0_25px_rgba(245,158,11,0.35)] ring-2 ring-amber-400'
                        : 'shadow-[0_15px_30px_-5px_rgba(0,0,0,0.8)] border border-white/15'
                    }`}
                  >
                    {coverFailed ? (
                      <div className="flex h-full w-full flex-col justify-between p-3 bg-gradient-to-br from-[#382b22] via-[#241a14] to-[#120d0a] text-amber-100">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400">
                          {book.genre || 'Classic'}
                        </span>
                        <p className="text-xs font-semibold leading-tight line-clamp-3">
                          {book.title}
                        </p>
                        <p className="text-[10px] text-amber-200/70 truncate">{book.author}</p>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverSrc}
                        alt={book.title}
                        loading={Math.abs(u) < 0.6 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={() =>
                          setFailedCovers((prev) => (prev[book.id] ? prev : { ...prev, [book.id]: true }))
                        }
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    )}

                    {/* Hardcover Spine Ridge */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/80 via-black/30 via-white/10 to-transparent shadow-[inset_1px_0_0_rgba(255,255,255,0.25)]"
                    />

                    {/* Right Edge Page Thickness */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-[4px] bg-gradient-to-r from-[#dcd0be] to-[#bfae96] border-l border-black/20"
                    />

                    {/* Specular Glare on Hover */}
                    <div
                      aria-hidden="true"
                      className="book-sheen-sweep pointer-events-none absolute inset-0 z-20"
                    />

                    {/* Floating badge on hover */}
                    {book.year && (
                      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="rounded-full bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-amber-300 border border-amber-400/30">
                          {book.year < 0 ? `${Math.abs(book.year)} BCE` : book.year}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Author / Title Below */}
                  <div
                    className={`mt-2 text-center transition-opacity duration-200 ${
                      Math.abs(u) < 0.5 || isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-amber-200">
                      {book.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">{book.author}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: FUN MODE — Zero-G Floating Cosmos of Navigable Books
          ========================================================================= */}
      {viewMode === 'fun' && (
        <div
          onPointerDown={handleFunPointerDown}
          onPointerMove={handleFunPointerMove}
          onPointerUp={handleFunPointerUp}
          onWheel={handleFunWheel}
          className="relative h-[calc(100vh-5rem)] w-full overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Atmospheric Background: Nebula blobs + starfield */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-indigo-600/8 blur-[150px]" />
            <div className="absolute bottom-1/3 right-1/4 h-[480px] w-[480px] rounded-full bg-amber-600/8 blur-[160px]" />
            <div className="absolute top-2/3 left-1/5 h-72 w-72 rounded-full bg-rose-700/6 blur-[120px]" />
            {Array.from({ length: 48 }, (_, i) => {
              const x = (i * 2.07 + 3.1) % 100;
              const y = (i * 5.73 + 7.3) % 100;
              const size = (i % 3) === 0 ? 2 : 1;
              const opacity = 0.12 + (i % 7) * 0.08;
              const twinkle = i % 4 === 0 ? 'animate-pulse' : '';
              return (
                <div
                  key={`star-${i}`}
                  style={{ left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, opacity }}
                  className={`absolute rounded-full bg-white ${twinkle}`}
                />
              );
            })}
          </div>

          {/* Top Navigation Guide */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 border border-white/12 backdrop-blur-md text-[11px] font-mono text-zinc-400 shadow-lg pointer-events-none">
            <span className="text-amber-400 font-semibold tracking-wide">Zero-G</span>
            <span className="text-zinc-700">|</span>
            <span>Drag</span>
            <span className="text-zinc-700">·</span>
            <span>Scroll to zoom</span>
            <span className="text-zinc-700">·</span>
            <span>Click to open</span>
            <span className="text-zinc-700">·</span>
            <kbd className="px-1 py-0.5 rounded bg-white/10 border border-white/15 text-zinc-300">Space</kbd>
            <span>pulse</span>
          </div>

          {/* 3D Flight Camera Viewport */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
          >
            {/* World Container: Camera + Mouse Parallax */}
            <div
              style={{
                transform: `translate3d(${-funCamera.x}px, ${-funCamera.y}px, ${
                  funCamera.z
                }px) rotateX(${funMouseParallax.y}deg) rotateY(${funMouseParallax.x}deg)`,
                transformStyle: 'preserve-3d',
                transition: isFunPanning
                  ? 'none'
                  : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="absolute inset-0 flex items-center justify-center will-change-transform"
            >
              {funBooks.map((item) => {
                const book = item.book;
                let x = item.baseX;
                let y = item.baseY;
                let z = item.baseZ;
                let rotX = item.baseRotX;
                let rotY = item.baseRotY;
                let rotZ = item.baseRotZ;

                if (funFormation === 'orbit') {
                  x = Math.cos(item.orbitAngle) * item.orbitRadius;
                  y = item.orbitY + Math.sin(item.orbitAngle * 2) * 20;
                  z = Math.sin(item.orbitAngle) * item.orbitRadius;
                  rotX = 0;
                  rotY = (-item.orbitAngle * 180) / Math.PI + 90;
                  rotZ = 0;
                } else if (funFormation === 'vortex') {
                  x = Math.cos(item.vortexAngle) * item.vortexRadius;
                  y = item.vortexY;
                  z = Math.sin(item.vortexAngle) * item.vortexRadius + item.vortexZ;
                  rotX = -10;
                  rotY = (-item.vortexAngle * 180) / Math.PI + 90;
                  rotZ = 10;
                }

                const isHovered = hoveredFunId === item.id;
                const coverSrc = book.cover || book.cover_url;
                const coverFailed = !coverSrc || failedCovers[book.id];

                return (
                  <button
                    type="button"
                    key={item.id}
                    onMouseEnter={() => setHoveredFunId(item.id)}
                    onMouseLeave={() => setHoveredFunId(null)}
                    onClick={(e) => handleCardClick(book, e)}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${
                        isHovered ? z + 160 : z
                      }px) scale(${isHovered ? 1.4 : 1}) rotateX(${
                        isHovered ? 0 : rotX
                      }deg) rotateY(${isHovered ? 0 : rotY}deg) rotateZ(${
                        isHovered ? 0 : rotZ
                      }deg)`,
                      zIndex: isHovered ? 120 : Math.round(50 + z / 10),
                      transition: isHovered
                        ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className={`group absolute cursor-pointer will-change-transform text-left focus:outline-none`}
                    aria-label={`${book.title} by ${book.author}`}
                  >
                    {/* Zero-G Float wrapper */}
                    <div
                      style={{
                        animationDelay: `-${item.phase * 1.5}s`,
                        animationDuration: `${5.5 + (item.index % 5) * 0.7}s`,
                      }}
                      className={`${isHovered ? '' : 'zero-g-float'} ${isFunPulsing ? 'gravity-pulse-anim' : ''}`}
                    >
                      {/* Book cover */}
                      <div
                        className={`relative w-[120px] sm:w-[145px] lg:w-[162px] aspect-[2/3] rounded-[7px] overflow-hidden bg-[#241c17] transition-shadow duration-300 ${
                          isHovered
                            ? 'shadow-[0_35px_80px_rgba(0,0,0,0.98),0_0_40px_rgba(245,158,11,0.55)] ring-2 ring-amber-400/90'
                            : 'shadow-[0_12px_30px_rgba(0,0,0,0.8)] border border-white/12'
                        }`}
                      >
                        {coverFailed ? (
                          <div className="flex h-full w-full flex-col justify-between p-3.5 bg-gradient-to-br from-[#382b22] via-[#241a14] to-[#120d0a] text-amber-100">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400">
                              {book.genre || 'Classic'}
                            </span>
                            <p className="text-xs font-semibold leading-tight line-clamp-3">{book.title}</p>
                            <p className="text-[10px] text-amber-200/70 truncate">{book.author}</p>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt={book.title}
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setFailedCovers((prev) =>
                                prev[book.id] ? prev : { ...prev, [book.id]: true }
                              )
                            }
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                          />
                        )}

                        {/* Spine */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/85 via-black/35 via-white/15 to-transparent shadow-[inset_1px_0_0_rgba(255,255,255,0.25)]"
                        />
                        {/* Page edge */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 right-0 w-[4px] bg-gradient-to-r from-[#dcd0be] to-[#bfae96] border-l border-black/20"
                        />
                        {/* Specular sheen */}
                        <div
                          aria-hidden="true"
                          className="book-sheen-sweep pointer-events-none absolute inset-0 z-20"
                        />

                        {/* Year badge — always visible for near/hovered books */}
                        {book.year && (
                          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="rounded-full bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-400/30">
                              {book.year < 0 ? `${Math.abs(book.year)} BCE` : book.year}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Hover tooltip — richer info panel */}
                      {isHovered && (
                        <div className="absolute -bottom-[72px] left-1/2 -translate-x-1/2 z-50 w-56 p-2.5 rounded-xl bg-black/95 border border-amber-400/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <p className="text-xs font-bold text-white truncate leading-snug">{book.title}</p>
                          <p className="text-[10px] text-amber-200/80 truncate mt-0.5">{book.author}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-500">{book.genre || 'Classic'}</span>
                            <span className="text-[9px] font-semibold text-amber-400 tracking-wide uppercase">
                              Click to open →
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Radar Minimap (Bottom Left) */}
          <div className="absolute bottom-5 left-5 z-40 hidden sm:flex flex-col items-center gap-1 p-2 rounded-2xl bg-black/85 border border-white/12 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between w-full px-0.5 mb-0.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                RADAR
              </span>
              <span className="text-[9px] font-mono text-zinc-500">{funBooks.length}</span>
            </div>
            <div className="relative w-24 h-24 rounded-full bg-zinc-950 border border-white/15 overflow-hidden flex items-center justify-center">
              {/* Distance rings */}
              <div className="absolute inset-3 rounded-full border border-white/8" />
              <div className="absolute inset-8 rounded-full border border-white/8" />
              <div className="absolute h-full w-[1px] bg-white/8" />
              <div className="absolute w-full h-[1px] bg-white/8" />
              {/* Radar sweep */}
              <div className="absolute inset-0 rounded-full animate-spin [animation-duration:3.5s] border-r border-emerald-400/25 bg-gradient-to-tr from-transparent via-transparent to-emerald-400/8 pointer-events-none" />
              {/* Book dots */}
              {funBooks.slice(0, 24).map((b) => {
                const relX = (b.baseX - funCamera.x) / 18;
                const relY = (b.baseY - funCamera.y) / 18;
                const dist = Math.sqrt(relX * relX + relY * relY);
                if (dist > 42) return null;
                return (
                  <div
                    key={`radar-${b.id}`}
                    style={{ transform: `translate(${relX}px, ${relY}px)` }}
                    className="absolute h-1 w-1 rounded-full bg-amber-400/80"
                  />
                );
              })}
              {/* Player reticle */}
              <div className="absolute h-2 w-2 rounded-full border border-emerald-400 bg-emerald-400/30 shadow-[0_0_5px_rgba(16,185,129,0.7)]" />
            </div>
          </div>

          {/* Bottom Command Bar */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-black/90 border border-white/12 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
            {/* Formation Selector */}
            <div className="flex items-center rounded-full bg-white/8 p-0.5 border border-white/8">
              {(['free', 'orbit', 'vortex'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFunFormation(f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono capitalize transition-all ${
                    funFormation === f
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f === 'free' ? 'Cosmos' : f === 'orbit' ? 'Orbit' : 'Vortex'}
                </button>
              ))}
            </div>

            <span className="h-4 w-[1px] bg-white/15" />

            {/* Gravity Pulse */}
            <button
              type="button"
              onClick={triggerFunPulse}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border transition-all hover:scale-105 active:scale-95 ${
                isFunPulsing
                  ? 'bg-amber-400/30 border-amber-400/60 text-amber-200'
                  : 'bg-white/8 border-amber-400/20 text-amber-300 hover:bg-white/15'
              }`}
              title="Gravity shockwave (Space)"
            >
              <Zap className={`h-3 w-3 ${isFunPulsing ? 'fill-amber-200' : 'fill-amber-300'} text-amber-300`} />
              <span>Pulse</span>
            </button>

            <span className="h-4 w-[1px] bg-white/15" />

            {/* Reset Camera */}
            <button
              type="button"
              onClick={() => setFunCamera({ x: 0, y: 0, z: 0 })}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] font-mono border border-white/8 transition-all hover:scale-105 active:scale-95"
              title="Reset to center (R)"
            >
              <Compass className="h-3 w-3" />
              <span>Reset</span>
            </button>

            <span className="h-4 w-[1px] bg-white/15" />

            {/* Zoom Stepper */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setFunCamera((p) => ({ ...p, z: Math.max(-400, p.z - 90) }))}
                aria-label="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 hover:bg-white hover:text-black text-zinc-300 transition-all text-sm font-bold"
              >
                −
              </button>
              <span className="text-[10px] font-mono text-zinc-500 w-9 text-center tabular-nums">
                {funCamera.z > 0 ? '+' : ''}{Math.round(funCamera.z)}
              </span>
              <button
                type="button"
                onClick={() => setFunCamera((p) => ({ ...p, z: Math.min(650, p.z + 90) }))}
                aria-label="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 hover:bg-white hover:text-black text-zinc-300 transition-all text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BackToGlobeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs sm:text-sm font-semibold text-black shadow-[0_10px_25px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all hover:bg-white hover:scale-105 hover:shadow-[0_14px_28px_-6px_rgba(255,255,255,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Back to globe</span>
      <kbd className="hidden sm:inline-block rounded-md bg-zinc-200/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zinc-800 border border-zinc-300">
        Esc
      </kbd>
    </button>
  );
}
