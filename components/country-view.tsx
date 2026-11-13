'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GeoBook } from '@/lib/geo-types';
import { PopOrigin } from '@/components/book-details-modal';
import {
  ArrowLeft,
  Sparkles,
  Star,
  Compass,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RotateCw,
  Volume2,
  VolumeX,
  Rewind,
  Layers,
} from 'lucide-react';

export type ViewMode = 'line' | 'cassette';

// Tactile Web Audio Synthesizer for Cassette Mode (Click, Tape Transport, Page Flip)
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
    } else if (type === 'flip') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1300, now);
      filter.Q.setValueAtTime(1.2, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
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

  // --- Cassette Mode State ---
  const [cassetteIndex, setCassetteIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [clockTime, setClockTime] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCenter, setIsDraggingCenter] = useState(false);
  const [leftStackHovered, setLeftStackHovered] = useState(false);
  const [rightStackHovered, setRightStackHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const centerCardRef = useRef<HTMLDivElement>(null);
  const dragCenterStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastInteractTimeRef = useRef(0);

  // Filtered books for Cassette Mode by selected genre
  const cassetteBooks = useMemo(() => {
    if (!selectedGenre) return books;
    return books.filter((b) => (b.genre || 'Classic').toLowerCase() === selectedGenre.toLowerCase());
  }, [books, selectedGenre]);

  // Unique genres with counts for Cassette sidebar
  const genreCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of books) {
      const g = (b.genre || 'Classic').trim();
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [books]);

  // Repeat books in Line Mode so the 3D infinite ribbon is always lush and full
  const ribbonBooks = useMemo(() => {
    if (books.length === 0) return [];
    if (books.length >= 14) return books;
    const repeated: GeoBook[] = [];
    while (repeated.length < 18) repeated.push(...books);
    return repeated;
  }, [books]);

  // Live ticking clock in Cassette Mode (matching reference: "May 28, 2018 / 08:44:59")
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      const timeStr = now.toTimeString().split(' ')[0];
      setClockTime(`${dateStr}\n${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // --- Cassette Navigation & Interaction Callbacks ---
  const handleDealNext = useCallback(() => {
    if (cassetteBooks.length === 0) return;
    playCassetteSound('tape', isAudioMuted);
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setCassetteIndex((prev) => (prev + 1) % cassetteBooks.length);
  }, [cassetteBooks.length, isAudioMuted]);

  const handleRewindPrev = useCallback(() => {
    if (cassetteBooks.length === 0) return;
    playCassetteSound('tape', isAudioMuted);
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setCassetteIndex((prev) => (prev - 1 + cassetteBooks.length) % cassetteBooks.length);
  }, [cassetteBooks.length, isAudioMuted]);

  const handleToggleFlip = useCallback(() => {
    playCassetteSound('flip', isAudioMuted);
    setIsFlipped((prev) => !prev);
  }, [isAudioMuted]);

  const handleOpenDetails = useCallback(
    (book: GeoBook, targetElement?: HTMLElement | null) => {
      playCassetteSound('click', isAudioMuted);
      const rect = targetElement?.getBoundingClientRect() || {
        left: window.innerWidth / 2 - 110,
        top: window.innerHeight / 2 - 160,
        width: 220,
        height: 320,
      };
      onSelectBook?.(book, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    },
    [isAudioMuted, onSelectBook]
  );

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

  // --- Cassette Mode Auto-Play ---
  useEffect(() => {
    if (viewMode !== 'cassette' || !isAutoPlaying || cassetteBooks.length === 0) return;

    const interval = setInterval(() => {
      handleDealNext();
    }, 3600);

    return () => clearInterval(interval);
  }, [viewMode, isAutoPlaying, cassetteBooks.length, handleDealNext]);

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
      } else {
        // Cassette Mode
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleDealNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleRewindPrev();
        } else if (e.code === 'Space') {
          e.preventDefault();
          setIsAutoPlaying((prev) => !prev);
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleToggleFlip();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const activeBook = cassetteBooks[cassetteIndex];
          if (activeBook) {
            handleOpenDetails(activeBook, centerCardRef.current);
          }
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setIsAudioMuted((prev) => !prev);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          playCassetteSound('tape', isAudioMuted);
          setCassetteIndex(0);
          setIsFlipped(false);
          setDragOffset({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    keysActive,
    viewMode,
    books,
    cassetteBooks,
    cassetteIndex,
    handleSurpriseMe,
    handleDealNext,
    handleRewindPrev,
    handleToggleFlip,
    handleOpenDetails,
    isAudioMuted,
  ]);

  // Center Card 3D Tilt and Drag/Swipe Handlers
  const handleCenterMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingCenter) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: nx * 18, y: -ny * 14 });
  };

  const handleCenterMouseLeave = () => {
    if (!isDraggingCenter) {
      setMouseTilt({ x: 0, y: 0 });
    }
  };

  const handleCenterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    setIsDraggingCenter(true);
    dragCenterStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleCenterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCenter) return;
    const dx = e.clientX - dragCenterStartRef.current.x;
    const dy = e.clientY - dragCenterStartRef.current.y;
    setDragOffset({ x: dx, y: dy * 0.35 });
  };

  const handleCenterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCenter) return;
    setIsDraggingCenter(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const dx = dragOffset.x;
    const dy = dragOffset.y;
    setDragOffset({ x: 0, y: 0 });

    if (dx > 70) {
      // Swiped right -> deals card to right stack!
      handleDealNext();
    } else if (dx < -70) {
      // Swiped left -> returns card to left queue!
      handleRewindPrev();
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      // Tap on card body -> open modal
      const activeBook = cassetteBooks[cassetteIndex];
      if (activeBook) {
        handleOpenDetails(activeBook, centerCardRef.current);
      }
    }
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
            {viewMode === 'line' ? 'Literary Motion' : 'every : story'}
          </span>
        </div>

        {/* Right Info, View Mode Switcher, and Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* View Mode Switcher: Line Mode vs Cassette Mode */}
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
              onClick={() => setViewMode('cassette')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                viewMode === 'cassette'
                  ? 'bg-white text-black shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Cassette</span>
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
          {/* Left Editorial Section */}
          <div className="pointer-events-none relative z-20 flex flex-col justify-center px-6 sm:px-10 lg:px-14 lg:w-[48%] shrink-0">
            <div className="pointer-events-auto max-w-lg">
              {/* Kicker Tag */}
              <div className="flex items-center gap-2 mb-3">
                <span className="h-[1px] w-6 bg-amber-400/80" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-300/90 font-medium">
                  Canonical Literature · {country.name}
                </span>
              </div>

              {/* Editorial Serif Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                {country.flag ? <span className="mr-2 inline-block">{country.flag}</span> : null}
                Every frame,
                <br />
                <span className="italic font-light text-zinc-300">every story.</span>
              </h1>

              {/* Tagline / Subtitle */}
              <p className="mt-4 text-xs sm:text-sm lg:text-base leading-relaxed text-zinc-400 font-light max-w-md">
                {country.tagline ||
                  `Centuries of monumental words, philosophical depth, and national soul — one infinite 3D reel. Hover to feel it; click to see it full.`}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (books.length > 0) {
                      onSelectBook?.(books[0], {
                        left: window.innerWidth / 2 - 100,
                        top: window.innerHeight / 2 - 140,
                        width: 200,
                        height: 280,
                      });
                    }
                  }}
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-black shadow-[0_8px_20px_rgba(255,255,255,0.18)] hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Explore canon</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>

                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all active:scale-95"
                >
                  View random
                </button>
              </div>

              {/* Bottom Accolades & Social Proof Bar */}
              <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-light">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 font-mono font-semibold text-zinc-200">4.9</span>
                </div>
                <span className="text-zinc-600">|</span>
                <span>{books.length} canon titles</span>
                <span className="text-zinc-600">|</span>
                <span>Timeless world voices</span>
              </div>
            </div>
          </div>

          {/* Right / Center 3D Infinite Ribbon of Floating Books */}
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
          VIEW MODE 2: CASSETTE MODE (Tactile Left-to-Right Physical Stacks Deck)
          ========================================================================= */}
      {viewMode === 'cassette' && (
        <div className="relative flex h-[calc(100vh-5rem)] w-full items-center justify-between px-4 sm:px-10 overflow-hidden select-none">
          {/* Top Left: Date/Time Stamp & Canonical Info */}
          <div className="absolute top-4 left-5 sm:left-10 z-30 font-mono text-[11px] text-zinc-400 leading-tight">
            <div className="flex items-center gap-2">
              {country.flag && <span className="text-base">{country.flag}</span>}
              <p className="text-zinc-200 font-semibold">{country.name}</p>
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                CASSETTE DECK
              </span>
            </div>
            <p className="text-zinc-400 whitespace-pre-line mt-1">{clockTime}</p>
          </div>

          {/* 3D Physical Stacks Arena (Left Stack -> Active Center -> Right Stack) */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {/* ---------------------------------------------------- */}
            {/* 1. LEFT STACK: UNREAD QUEUE (Books waiting to be dealt) */}
            {/* ---------------------------------------------------- */}
            {cassetteBooks.length - 1 - cassetteIndex > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: isWide ? '45%' : '43%',
                  transform: `translate(-50%, -50%) translate3d(${
                    isWide ? -370 : isTablet ? -280 : -180
                  }px, 0px, 20px)`,
                  zIndex: 40,
                }}
                onMouseEnter={() => setLeftStackHovered(true)}
                onMouseLeave={() => setLeftStackHovered(false)}
                onClick={handleDealNext}
                className="cursor-pointer group flex flex-col items-center"
                title="Click to deal next book"
              >
                {/* Header Tag above Left Stack */}
                <div className="absolute -top-12 z-50 text-center transition-transform duration-200 group-hover:-translate-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 border border-amber-400/30 backdrop-blur-md shadow-md">
                    <Layers className="h-3 w-3 text-amber-400" />
                    <span className="text-[11px] font-mono text-zinc-200">
                      QUEUE{' '}
                      <strong className="text-amber-300">
                        {cassetteBooks.length - 1 - cassetteIndex}
                      </strong>
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-400 mt-1 uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                    Click to deal →
                  </p>
                </div>

                {/* Render stacked cards in Queue */}
                {cassetteBooks.map((book, i) => {
                  if (i <= cassetteIndex) return null;
                  const k = i - (cassetteIndex + 1); // 0 is top of left stack
                  if (k > 4) return null; // render top 5 cards

                  const fanSpread = leftStackHovered ? 14 : 3.5;
                  const fanRot = leftStackHovered ? k * 2.2 : 0;
                  const x = -k * fanSpread;
                  const y = k * (leftStackHovered ? 3.5 : 2);
                  const z = 40 - k * 12;
                  const scale = Math.max(0.72, 0.86 - k * 0.025);
                  const rotY = 16 - k * 0.5;
                  const rotX = 8;
                  const rotZ = -5 + (k % 3) * 1.5 - fanRot;
                  const opacity = Math.max(0.25, 1 - k * 0.16);
                  const coverSrc = book.cover || book.cover_url;
                  const coverFailed = !coverSrc || failedCovers[book.id];

                  return (
                    <div
                      key={`left-stack-${book.id}-${i}`}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
                        opacity,
                        zIndex: 30 - k,
                        transition:
                          'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s',
                      }}
                      className="pointer-events-none will-change-transform"
                    >
                      <div
                        className={`relative w-[150px] sm:w-[180px] lg:w-[210px] aspect-[2/3] rounded-[6px] overflow-hidden bg-[#241c17] transition-all duration-300 ${
                          k === 0 && leftStackHovered
                            ? 'ring-2 ring-amber-400 shadow-[0_20px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.35)]'
                            : 'shadow-[0_15px_30px_rgba(0,0,0,0.8)] border border-white/10'
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
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setFailedCovers((prev) =>
                                prev[book.id] ? prev : { ...prev, [book.id]: true }
                              )
                            }
                            className="h-full w-full object-cover"
                          />
                        )}
                        {/* Spine & Edge */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/80 via-black/30 via-white/10 to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 right-0 w-[4px] bg-gradient-to-r from-[#dcd0be] to-[#bfae96] border-l border-black/20"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Empty Queue Deck Placeholder
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: isWide ? '45%' : '43%',
                  transform: `translate(-50%, -50%) translate3d(${
                    isWide ? -370 : isTablet ? -280 : -180
                  }px, 0px, 20px) rotateY(16deg) rotateX(8deg) rotateZ(-5deg) scale(0.84)`,
                  zIndex: 20,
                }}
                className="w-[150px] sm:w-[180px] lg:w-[210px] aspect-[2/3] rounded-[8px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-4 text-center pointer-events-none select-none bg-black/20"
              >
                <Sparkles className="h-6 w-6 text-amber-400/50 mb-2" />
                <p className="text-xs font-mono font-medium text-amber-300/80">Queue Cleared</p>
                <p className="text-[10px] text-zinc-500 mt-1">All titles read</p>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 2. CENTER STAGE: ACTIVE INSPECTABLE BOOK             */}
            {/* ---------------------------------------------------- */}
            {cassetteBooks[cassetteIndex] && (
              <div
                ref={centerCardRef}
                onMouseMove={handleCenterMouseMove}
                onMouseLeave={handleCenterMouseLeave}
                onPointerDown={handleCenterPointerDown}
                onPointerMove={handleCenterPointerMove}
                onPointerUp={handleCenterPointerUp}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: isWide ? '45%' : '43%',
                  transform: `translate(-50%, -50%) translate3d(${dragOffset.x}px, ${
                    dragOffset.y
                  }px, 80px) rotateY(${mouseTilt.x + dragOffset.x * 0.05}deg) rotateX(${
                    mouseTilt.y
                  }deg) rotateZ(${dragOffset.x * 0.04}deg)`,
                  perspective: '1200px',
                  transformStyle: 'preserve-3d',
                  zIndex: 80,
                  cursor: isDraggingCenter ? 'grabbing' : 'grab',
                }}
                className="will-change-transform select-none touch-none flex flex-col items-center"
              >
                {/* Visual Directional Swiping Guideline Glow Badges */}
                {dragOffset.x > 35 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3.5 py-1 rounded-full bg-emerald-500/95 text-black text-[11px] font-mono font-bold shadow-lg animate-pulse whitespace-nowrap border border-emerald-300">
                    → Release to Stack as Read
                  </div>
                )}
                {dragOffset.x < -35 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3.5 py-1 rounded-full bg-amber-500/95 text-black text-[11px] font-mono font-bold shadow-lg animate-pulse whitespace-nowrap border border-amber-300">
                    ← Release to Return to Queue
                  </div>
                )}

                {/* 3D Flipping Card Container */}
                <div
                  style={{
                    transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: isDraggingCenter
                      ? 'none'
                      : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="relative w-[170px] sm:w-[210px] lg:w-[235px] aspect-[2/3] rounded-[8px]"
                >
                  {/* FRONT FACE: High-Res Hardcover with Spine & Sheen */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                    className="absolute inset-0 rounded-[8px] overflow-hidden bg-[#241c17] shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.35)] border border-white/20 group"
                  >
                    {failedCovers[cassetteBooks[cassetteIndex].id] ||
                    !(
                      cassetteBooks[cassetteIndex].cover ||
                      cassetteBooks[cassetteIndex].cover_url
                    ) ? (
                      <div className="flex h-full w-full flex-col justify-between p-4 bg-gradient-to-br from-[#382b22] via-[#241a14] to-[#120d0a] text-amber-100">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                          {cassetteBooks[cassetteIndex].genre || 'Classic'}
                        </span>
                        <p className="text-base font-semibold leading-tight line-clamp-4">
                          {cassetteBooks[cassetteIndex].title}
                        </p>
                        <p className="text-xs text-amber-200/70 truncate">
                          {cassetteBooks[cassetteIndex].author}
                        </p>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          cassetteBooks[cassetteIndex].cover ||
                          cassetteBooks[cassetteIndex].cover_url
                        }
                        alt={cassetteBooks[cassetteIndex].title}
                        loading="eager"
                        decoding="async"
                        onError={() =>
                          setFailedCovers((prev) => ({
                            ...prev,
                            [cassetteBooks[cassetteIndex].id]: true,
                          }))
                        }
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    )}

                    {/* Hardcover Spine Ridge */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/85 via-black/35 via-white/15 to-transparent shadow-[inset_1px_0_0_rgba(255,255,255,0.25)]"
                    />

                    {/* Page Edge Thickness */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-[5px] bg-gradient-to-r from-[#dcd0be] to-[#bfae96] border-l border-black/20"
                    />

                    {/* Specular Glare */}
                    <div
                      aria-hidden="true"
                      className="book-sheen-sweep pointer-events-none absolute inset-0 z-20"
                    />

                    {/* Top Right Flip Icon Pill Button */}
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFlip();
                      }}
                      className="absolute top-2.5 right-2.5 z-30 inline-flex items-center gap-1 rounded-full bg-black/75 hover:bg-black/90 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-400/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                      title="Flip cover to read synopsis (Hotkey: F)"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Flip</span>
                    </button>

                    {/* Bottom Metadata Bar */}
                    {cassetteBooks[cassetteIndex].year && (
                      <div className="absolute bottom-2.5 left-3 z-30">
                        <span className="rounded-full bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-amber-300 border border-amber-400/30">
                          {cassetteBooks[cassetteIndex].year < 0
                            ? `${Math.abs(cassetteBooks[cassetteIndex].year)} BCE`
                            : cassetteBooks[cassetteIndex].year}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* BACK FACE: Hardcover Cloth Weave with Synopsis & Fast Actions */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                    className="absolute inset-0 rounded-[8px] overflow-hidden bg-gradient-to-br from-[#2a1e16] via-[#1a130e] to-[#0d0907] p-4 sm:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.25)] border border-amber-500/35 flex flex-col justify-between text-left"
                  >
                    {/* Gold Inlay Frame Accent */}
                    <div className="pointer-events-none absolute inset-2 rounded-[5px] border border-amber-400/20" />

                    <div>
                      <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-semibold">
                          Synopsis & Canon
                        </span>
                        <button
                          type="button"
                          data-no-drag="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlip();
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Front</span>
                        </button>
                      </div>

                      <h3 className="mt-2.5 font-serif text-sm sm:text-base font-normal text-white line-clamp-2 leading-tight">
                        {cassetteBooks[cassetteIndex].title}
                      </h3>
                      <p className="text-[11px] text-amber-200/80 font-mono mt-0.5 truncate">
                        {cassetteBooks[cassetteIndex].author}
                      </p>

                      <p className="mt-3 text-[11px] sm:text-xs leading-relaxed text-zinc-300 line-clamp-5 font-serif italic text-amber-100/90">
                        {cassetteBooks[cassetteIndex].description ||
                          cassetteBooks[cassetteIndex].tagline ||
                          `An enduring masterpiece reflecting the deep cultural spirit, historical triumph, and profound humanity of ${country.name}.`}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-amber-400 truncate">
                        {cassetteBooks[cassetteIndex].genre || 'Classic'}
                      </span>
                      <button
                        type="button"
                        data-no-drag="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(
                            cassetteBooks[cassetteIndex],
                            centerCardRef.current
                          );
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-950 bg-amber-300 hover:bg-amber-200 px-2.5 py-1 rounded-full shadow transition-all hover:scale-105 active:scale-95"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Open Reader</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Book Info & Interactive Control Pill */}
                <div className="mt-4 text-center max-w-[260px] animate-in fade-in duration-300">
                  <p className="text-sm font-bold text-white truncate text-shadow-sm">
                    {cassetteBooks[cassetteIndex].title}
                  </p>
                  <p className="text-xs text-amber-200/80 truncate">
                    {cassetteBooks[cassetteIndex].author}
                  </p>

                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFlip();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-200 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>{isFlipped ? 'Cover' : 'Flip (F)'}</span>
                    </button>

                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(
                          cassetteBooks[cassetteIndex],
                          centerCardRef.current
                        );
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-950 bg-white hover:bg-zinc-200 px-3 py-1 rounded-full shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDealNext();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                    >
                      <span>Stack →</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* 3. RIGHT STACK: ARCHIVE / EXPLORED BOOKS             */}
            {/* ---------------------------------------------------- */}
            {cassetteIndex > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: isWide ? '45%' : '43%',
                  transform: `translate(-50%, -50%) translate3d(${
                    isWide ? 370 : isTablet ? 280 : 180
                  }px, 0px, 20px)`,
                  zIndex: 40,
                }}
                onMouseEnter={() => setRightStackHovered(true)}
                onMouseLeave={() => setRightStackHovered(false)}
                onClick={handleRewindPrev}
                className="cursor-pointer group flex flex-col items-center"
                title="Click to rewind to previously explored book"
              >
                {/* Header Tag above Right Stack */}
                <div className="absolute -top-12 z-50 text-center transition-transform duration-200 group-hover:-translate-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 border border-emerald-400/30 backdrop-blur-md shadow-md">
                    <Layers className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] font-mono text-zinc-200">
                      EXPLORED <strong className="text-emerald-300">{cassetteIndex}</strong>
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-400 mt-1 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
                    ← Click to rewind
                  </p>
                </div>

                {/* Render stacked cards in Archive */}
                {cassetteBooks.map((book, i) => {
                  if (i >= cassetteIndex) return null;
                  const k = cassetteIndex - 1 - i; // 0 is the top of right stack
                  if (k > 4) return null; // render top 5 cards

                  const fanSpread = rightStackHovered ? 14 : 3.5;
                  const fanRot = rightStackHovered ? k * 2.2 : 0;
                  const x = k * fanSpread;
                  const y = k * (rightStackHovered ? 3.5 : 2);
                  const z = 40 - k * 12;
                  const scale = Math.max(0.72, 0.86 - k * 0.025);
                  const rotY = -16 + k * 0.5;
                  const rotX = 8;
                  const rotZ = 5 - (k % 3) * 1.5 + fanRot;
                  const opacity = Math.max(0.25, 1 - k * 0.16);
                  const coverSrc = book.cover || book.cover_url;
                  const coverFailed = !coverSrc || failedCovers[book.id];

                  return (
                    <div
                      key={`right-stack-${book.id}-${i}`}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
                        opacity,
                        zIndex: 30 - k,
                        transition:
                          'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s',
                      }}
                      className="pointer-events-none will-change-transform"
                    >
                      <div
                        className={`relative w-[150px] sm:w-[180px] lg:w-[210px] aspect-[2/3] rounded-[6px] overflow-hidden bg-[#241c17] transition-all duration-300 ${
                          k === 0 && rightStackHovered
                            ? 'ring-2 ring-emerald-400 shadow-[0_20px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(16,185,129,0.35)]'
                            : 'shadow-[0_15px_30px_rgba(0,0,0,0.8)] border border-white/10'
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
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setFailedCovers((prev) =>
                                prev[book.id] ? prev : { ...prev, [book.id]: true }
                              )
                            }
                            className="h-full w-full object-cover"
                          />
                        )}
                        {/* Spine & Edge */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/80 via-black/30 via-white/10 to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 right-0 w-[4px] bg-gradient-to-r from-[#dcd0be] to-[#bfae96] border-l border-black/20"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Empty Archive Deck Placeholder
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: isWide ? '45%' : '43%',
                  transform: `translate(-50%, -50%) translate3d(${
                    isWide ? 370 : isTablet ? 280 : 180
                  }px, 0px, 20px) rotateY(-16deg) rotateX(8deg) rotateZ(5deg) scale(0.84)`,
                  zIndex: 20,
                }}
                className="w-[150px] sm:w-[180px] lg:w-[210px] aspect-[2/3] rounded-[8px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-4 text-center pointer-events-none select-none bg-black/20"
              >
                <Layers className="h-6 w-6 text-zinc-600 mb-2" />
                <p className="text-xs font-mono font-medium text-zinc-400">Archive Deck</p>
                <p className="text-[10px] text-zinc-600 mt-1">Explored books stack here</p>
              </div>
            )}
          </div>

          {/* Right Sidebar: Topics & Genres list with exponent counts from Reference Pin */}
          <aside className="hidden lg:flex flex-col items-end gap-1.5 select-none z-30 ml-auto pr-2 sm:pr-4">
            <button
              type="button"
              onClick={() => {
                setSelectedGenre(null);
                setCassetteIndex(0);
                setIsFlipped(false);
              }}
              className={`text-xs font-mono transition-colors text-right ${
                selectedGenre === null
                  ? 'text-white font-bold tracking-wider'
                  : 'text-zinc-500 hover:text-zinc-300 font-light'
              }`}
            >
              all <span className="text-[10px] text-amber-400 align-super">{books.length}</span>
            </button>

            {genreCounts.map(([genre, count]) => {
              const active = selectedGenre?.toLowerCase() === genre.toLowerCase();
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(genre);
                    setCassetteIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`text-xs font-mono transition-colors text-right lowercase ${
                    active
                      ? 'text-white font-bold tracking-wider'
                      : 'text-zinc-500 hover:text-zinc-300 font-light'
                  }`}
                >
                  {genre}{' '}
                  <span className="text-[10px] text-zinc-400 align-super">{count}</span>
                </button>
              );
            })}
          </aside>

          {/* =========================================================================
              BOTTOM CASSETTE TAPE PLAYER TRANSPORT HUD
              ========================================================================= */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-8 lg:inset-x-12 z-40 flex flex-col md:flex-row items-center justify-between gap-3 bg-black/80 border border-white/15 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
            {/* Left: Dual Spinning Cassette Tape Spools & Status */}
            <div className="flex items-center gap-3">
              {/* Cassette Mechanical Chassis Visual */}
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 px-3 py-1.5 rounded-xl">
                {/* Spool A (Left / Source tape) */}
                <div className="relative h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {/* Tape coil circle */}
                  <div
                    style={{
                      width: `${Math.max(
                        10,
                        24 *
                          ((cassetteBooks.length - cassetteIndex) /
                            Math.max(1, cassetteBooks.length))
                      )}px`,
                      height: `${Math.max(
                        10,
                        24 *
                          ((cassetteBooks.length - cassetteIndex) /
                            Math.max(1, cassetteBooks.length))
                      )}px`,
                    }}
                    className="rounded-full bg-amber-900/80 transition-all duration-300"
                  />
                  {/* 3-spoke gear hub */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isAutoPlaying ? 'animate-spin' : ''
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-zinc-950 border border-zinc-600" />
                    <div className="absolute h-0.5 w-5 bg-zinc-400/40" />
                    <div className="absolute h-5 w-0.5 bg-zinc-400/40" />
                  </div>
                </div>

                {/* Connecting Magnetic Tape Ribbon */}
                <div className="w-8 sm:w-12 h-1 bg-gradient-to-r from-amber-900/80 via-amber-700/60 to-amber-900/80 rounded-full" />

                {/* Spool B (Right / Take-up tape) */}
                <div className="relative h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {/* Tape coil circle */}
                  <div
                    style={{
                      width: `${Math.max(
                        10,
                        24 * ((cassetteIndex + 1) / Math.max(1, cassetteBooks.length))
                      )}px`,
                      height: `${Math.max(
                        10,
                        24 * ((cassetteIndex + 1) / Math.max(1, cassetteBooks.length))
                      )}px`,
                    }}
                    className="rounded-full bg-amber-900/80 transition-all duration-300"
                  />
                  {/* 3-spoke gear hub */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isAutoPlaying ? 'animate-spin' : ''
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-zinc-950 border border-zinc-600" />
                    <div className="absolute h-0.5 w-5 bg-zinc-400/40" />
                    <div className="absolute h-5 w-0.5 bg-zinc-400/40" />
                  </div>
                </div>
              </div>

              {/* Tape Counter & Info */}
              <div className="flex flex-col font-mono leading-tight">
                <span className="text-[10px] text-amber-400 font-bold tracking-widest flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isAutoPlaying ? 'bg-rose-500 animate-ping' : 'bg-rose-500/80'
                    }`}
                  />
                  SIDE A · TAPE
                </span>
                <span className="text-xs font-semibold text-zinc-200 mt-0.5">
                  {String(cassetteIndex + 1).padStart(2, '0')} /{' '}
                  {String(cassetteBooks.length).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Center: Interactive Tape Timeline Scrubber */}
            <div className="flex-1 max-w-xs sm:max-w-md mx-2 w-full flex items-center gap-1.5">
              {cassetteBooks.map((b, idx) => {
                const isActive = idx === cassetteIndex;
                const isPast = idx < cassetteIndex;
                return (
                  <button
                    key={`scrub-${b.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      playCassetteSound('tape', isAudioMuted);
                      setCassetteIndex(idx);
                      setIsFlipped(false);
                    }}
                    title={`${idx + 1}. ${b.title} by ${b.author}`}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      isActive
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-y-125'
                        : isPast
                        ? 'bg-emerald-500/60 hover:bg-emerald-400'
                        : 'bg-zinc-700/60 hover:bg-zinc-500'
                    }`}
                  />
                );
              })}
            </div>

            {/* Right: Tape Transport Playback Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Rewind to 0 */}
              <button
                type="button"
                onClick={() => {
                  playCassetteSound('tape', isAudioMuted);
                  setCassetteIndex(0);
                  setIsFlipped(false);
                }}
                aria-label="Rewind tape to beginning"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all hover:scale-105 active:scale-95"
                title="Rewind tape to start (R)"
              >
                <Rewind className="h-3.5 w-3.5" />
              </button>

              {/* Previous Book */}
              <button
                type="button"
                onClick={handleRewindPrev}
                aria-label="Previous book"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all hover:scale-105 active:scale-95"
                title="Previous book (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Play / Pause Auto-Advance */}
              <button
                type="button"
                onClick={() => {
                  playCassetteSound('click', isAudioMuted);
                  setIsAutoPlaying((prev) => !prev);
                }}
                aria-label={isAutoPlaying ? 'Pause tape' : 'Play tape'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                title={isAutoPlaying ? 'Pause auto-play (Space)' : 'Play tape auto-play (Space)'}
              >
                {isAutoPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5 fill-black" />
                )}
              </button>

              {/* Next Book */}
              <button
                type="button"
                onClick={handleDealNext}
                aria-label="Next book"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all hover:scale-105 active:scale-95"
                title="Next book (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Flip Card */}
              <button
                type="button"
                onClick={handleToggleFlip}
                aria-label="Flip active card"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all hover:scale-105 active:scale-95"
                title="Flip card front/back (F)"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>

              {/* Audio Mute/Unmute */}
              <button
                type="button"
                onClick={() => setIsAudioMuted((prev) => !prev)}
                aria-label={isAudioMuted ? 'Unmute sounds' : 'Mute sounds'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white text-zinc-300 hover:text-black transition-all hover:scale-105 active:scale-95"
                title={isAudioMuted ? 'Unmute tape sound FX (M)' : 'Mute tape sound FX (M)'}
              >
                {isAudioMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-amber-300" />
                )}
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
