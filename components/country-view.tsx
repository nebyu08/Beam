'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { PopOrigin } from '@/components/book-details-modal';
import { ArrowLeft } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  keysActive?: boolean;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook, origin: PopOrigin) => void;
}

const STRIP_ANGLE = -20;
const STRIP_SPEEDS = [16, 22, 18, 26, 20, 24];

function lineUp(books: GeoBook[], count: number, minPerLine: number) {
  const lines = Math.min(count, Math.max(books.length, 1));
  const size = Math.ceil(books.length / lines);
  return Array.from({ length: lines }, (_, index) => {
    const line = books.slice(index * size, (index + 1) * size);
    if (line.length === 0 || line.length >= minPerLine) return line;
    const filled: GeoBook[] = [];
    while (filled.length < minPerLine) filled.push(...line);
    return filled.slice(0, minPerLine);
  }).filter((line) => line.length > 0);
}

function mod(value: number, size: number) {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
}

type ShelfPhase = 'pending' | 'intro' | 'live';

function ShelfIntro({ lines, onDone }: { lines: GeoBook[][]; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const view = root.getBoundingClientRect();
    const gap = 12;
    const pad = 8;
    const text = 34;
    const rowH = (view.height - (lines.length - 1) * gap - 16) / Math.max(lines.length, 1);
    const cardW = Math.max(76, (rowH - text) * (2 / 3));
    const coverH = Math.max(48, rowH - text);
    const colGap = 22;
    const total = lines.length * cardW + (lines.length - 1) * colGap;
    const originX = Math.max(pad, (view.width - total) / 2);
    const centerX = view.width / 2 - cardW / 2;
    const centerY = view.height * 0.46 - coverH / 2;
    let flat = 0;
    const cards: { el: HTMLDivElement; line: number; index: number; count: number }[] = [];
    lines.forEach((line, lineIndex) => {
      line.forEach((_, index) => {
        const el = cardRefs.current[flat];
        flat += 1;
        if (el) cards.push({ el, line: lineIndex, index, count: line.length });
      });
    });

    const deck = (order: number) => {
      const depth = Math.min(order, 18);
      return `translate3d(${centerX - depth * 6}px, ${centerY + depth * 0.3}px, 0) scale(1.7)`;
    };
    const column = (line: number, index: number, count: number) => {
      const step = Math.max(8, coverH * 0.14);
      const fromEnd = Math.min(count - 1 - index, 10);
      const top = view.height * 0.58 - coverH - Math.min(count - 1, 10) * step;
      return `translate3d(${originX + line * (cardW + colGap)}px, ${top + fromEnd * step}px, 0) scale(1.12)`;
    };
    const row = (line: number, index: number) => {
      const rad = (STRIP_ANGLE * Math.PI) / 180;
      const localX = pad + index * (cardW + gap) - view.width / 2;
      const localY = 8 + line * (rowH + gap) - view.height / 2;
      const x = view.width / 2 + localX * Math.cos(rad) - localY * Math.sin(rad);
      const y = view.height / 2 + localX * Math.sin(rad) + localY * Math.cos(rad);
      return `translate3d(${x}px, ${y}px, 0) scale(1)`;
    };

    cards.forEach((card, order) => {
      card.el.style.width = `${cardW}px`;
      card.el.style.height = `${rowH}px`;
      card.el.style.zIndex = String(400 - order);
    });

    const animations = cards.map((card, order) =>
      card.el.animate(
        [
          { transform: deck(order), offset: 0 },
          { transform: deck(order), offset: 0.14 },
          { transform: column(card.line, card.index, card.count), offset: 0.4 },
          { transform: column(card.line, card.index, card.count), offset: 0.58 },
          { transform: row(card.line, card.index), offset: 1 },
        ],
        {
          duration: 2200,
          delay: card.index * 14,
          easing: 'cubic-bezier(0.7, 0, 0.24, 1)',
          fill: 'both',
        },
      ),
    );
    const wait = 2200 + Math.max(0, ...lines.map((line) => (line.length - 1) * 14));
    const timer = window.setTimeout(onDone, wait);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
    // The line list is fixed for the life of this intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone]);

  const cards = lines
    .flatMap((line, lineIndex) => line.map((book, index) => ({ book, lineIndex, index })))
    .map((card, order) => ({ ...card, order }));
  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      {cards.map((card) => {
          const cover = card.book.cover || card.book.cover_url;
          return (
            <div
              key={`${card.lineIndex}-${card.index}-${card.book.id}`}
              ref={(node) => {
                cardRefs.current[card.order] = node;
              }}
              className="intro-card book-face"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-[calc(100%-2.1rem)] w-full object-contain" />
              ) : (
                <span className="flex h-[calc(100%-2.1rem)] items-end p-2 text-xs font-semibold leading-tight">
                  {card.book.title}
                </span>
              )}
              <span className="mt-1 block truncate px-0.5 text-xs font-semibold">{card.book.title}</span>
            </div>
          );
      })}
    </div>
  );
}

export default function CountryView({
  country,
  keysActive = true,
  onSelectBook,
}: CountryViewProps) {
  const books = country.books;
  const [failedCovers, setFailedCovers] = useState<Record<number, true>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<ShelfPhase>('pending');
  const [lineCount, setLineCount] = useState(6);
  const [minPerLine, setMinPerLine] = useState(1);
  const [measured, setMeasured] = useState(false);
  const finishIntro = useCallback(() => {
    liveRef.current = true;
    setPhase('live');
  }, []);
  const bookLines = lineUp(books, lineCount, minPerLine);
  const introLines = lineUp(books, lineCount, 1);
  const bookLinesRef = useRef(bookLines);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripOffsetsRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const keysActiveRef = useRef(keysActive);
  const placeBookRef = useRef<(index: number) => void>(() => {});
  const liveRef = useRef(false);
  const loop = reduced === false && books.length > 1;

  useEffect(() => {
    keysActiveRef.current = keysActive;
  }, [keysActive]);

  useLayoutEffect(() => {
    bookLinesRef.current = bookLines;
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const apply = () => {
      const next = viewport.clientHeight >= 720 ? 6 : 5;
      const rowHeight = (viewport.clientHeight - (next - 1) * 12 - 16) / next;
      const cardWidth = Math.max(72, (rowHeight - 32) * (2 / 3));
      viewport.style.setProperty('--card-h', `${Math.round(rowHeight)}px`);
      const across = Math.ceil(viewport.clientWidth / (cardWidth + 12)) + 2;
      viewport.style.setProperty('--card-w', `${Math.round(cardWidth)}px`);
      setLineCount((current) => (current === next ? current : next));
      setMinPerLine((current) => (current === across ? current : across));
      setMeasured(true);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [books.length]);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const begin = () => {
      setReduced(media.matches);
      if (!measured) return;
      if (media.matches || books.length < 2) {
        liveRef.current = true;
        setPhase('live');
        return;
      }
      liveRef.current = false;
      setPhase('intro');
    };

    begin();
    media.addEventListener('change', begin);
    return () => media.removeEventListener('change', begin);
  }, [books.length, measured]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!keysActive || books.length === 0) return;

    const stepLine = (index: number, direction: -1 | 1) => {
      const lengths = bookLinesRef.current.map((line) => line.length);
      if (lengths.length === 0) return index;
      let cursor = index;
      let row = 0;
      for (; row < lengths.length; row += 1) {
        if (cursor < lengths[row]) break;
        cursor -= lengths[row];
      }
      const nextRow = Math.min(lengths.length - 1, Math.max(0, row + direction));
      const col = Math.min(cursor, lengths[nextRow] - 1);
      let next = 0;
      for (let line = 0; line < nextRow; line += 1) next += lengths[line];
      return next + col;
    };

    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (
        key !== 'ArrowDown' &&
        key !== 'ArrowUp' &&
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight' &&
        key !== 'Home' &&
        key !== 'End'
      ) {
        return;
      }

      const typing =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';
      if (typing) return;

      const current = activeIndexRef.current;
      const total = bookLinesRef.current.reduce((sum, line) => sum + line.length, 0);
      const next =
        key === 'ArrowRight'
          ? Math.min(total - 1, current + 1)
          : key === 'ArrowLeft'
            ? Math.max(0, current - 1)
            : key === 'ArrowDown'
              ? stepLine(current, 1)
              : key === 'ArrowUp'
                ? stepLine(current, -1)
                : key === 'Home'
                  ? 0
                  : total - 1;
      if (next === current) return;

      event.preventDefault();
      activeIndexRef.current = next;
      setActiveIndex(next);
      const item = itemRefs.current[next];
      item?.focus();
      placeBookRef.current(next);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [books.length, keysActive]);

  useLayoutEffect(() => {
    placeBookRef.current = (index: number) => {
      const item = itemRefs.current[index];
      const track = trackRef.current;
      if (!item) return;
      const inner = item.closest('[data-strip-track]');
      if (!loop || !track || !(inner instanceof HTMLElement)) {
        item.scrollIntoView({ block: 'nearest' });
        return;
      }
      const strips = [...track.querySelectorAll('[data-strip-track]')];
      const stripIndex = strips.indexOf(inner);
      const half = inner.scrollWidth / 2;
      if (stripIndex < 0 || half <= 0) return;
      stripOffsetsRef.current[stripIndex] = mod(item.offsetLeft - 48, half);
      inner.style.transform = `translate3d(${-stripOffsetsRef.current[stripIndex]}px, 0, 0)`;
      pausedRef.current = true;
    };
  });

  useLayoutEffect(() => {
    if (!loop) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const tracks = () => [...track.querySelectorAll<HTMLElement>('[data-strip-track]')];
    const paintStrips = (advance: number) => {
      tracks().forEach((inner, index) => {
        const half = inner.scrollWidth / 2;
        if (half <= 0) return;
        const speed = STRIP_SPEEDS[index % STRIP_SPEEDS.length];
        stripOffsetsRef.current[index] = mod(
          (stripOffsetsRef.current[index] || 0) + advance * speed,
          half,
        );
        inner.style.transform = `translate3d(${-stripOffsetsRef.current[index]}px, 0, 0)`;
      });
    };
    const nudgeStrips = (delta: number) => {
      tracks().forEach((inner, index) => {
        const half = inner.scrollWidth / 2;
        if (half <= 0) return;
        stripOffsetsRef.current[index] = mod((stripOffsetsRef.current[index] || 0) + delta, half);
        inner.style.transform = `translate3d(${-stripOffsetsRef.current[index]}px, 0, 0)`;
      });
    };

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !document.hidden && keysActiveRef.current && liveRef.current) {
        paintStrips(dt);
      }
      frame = requestAnimationFrame(tick);
    };
    paintStrips(0);
    frame = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => paintStrips(0));
    observer.observe(track);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!liveRef.current) return;
      nudgeStrips(event.deltaY + event.deltaX);
    };

    let dragX = 0;
    let dragY = 0;
    let originX = 0;
    let originY = 0;
    let dragging = false;
    let dragged = false;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      dragged = false;
      dragX = originX = event.clientX;
      dragY = originY = event.clientY;
      pausedRef.current = true;
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      dragX = event.clientX;
      dragY = event.clientY;
      if (Math.hypot(event.clientX - originX, event.clientY - originY) > 6) dragged = true;
      if (!liveRef.current) return;
      nudgeStrips(-dx + dy * 0.35);
    };
    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const overBook = event.target instanceof Element && !!event.target.closest('[data-book-row]');
      const focused = document.activeElement instanceof Element
        && !!document.activeElement.closest('[data-book-row]');
      pausedRef.current = overBook || focused;
      if (!dragged) return;
      const swallow = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        viewport.removeEventListener('click', swallow, true);
      };
      viewport.addEventListener('click', swallow, true);
    };

    const bookUnderPointer = (event: Event) => {
      const target = event.target;
      return target instanceof Element && !!target.closest('[data-book-row]');
    };
    const onOver = (event: PointerEvent) => {
      if (dragging) return;
      const focused = document.activeElement instanceof Element
        && !!document.activeElement.closest('[data-book-row]');
      pausedRef.current = bookUnderPointer(event) || focused;
    };
    const onOut = (event: PointerEvent) => {
      if (dragging) return;
      const next = event.relatedTarget;
      const stillOnBook = next instanceof Element && !!next.closest('[data-book-row]');
      const focused = document.activeElement instanceof Element
        && !!document.activeElement.closest('[data-book-row]');
      if (!stillOnBook && !focused) pausedRef.current = false;
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointerover', onOver);
    viewport.addEventListener('pointerout', onOut);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointerover', onOver);
      viewport.removeEventListener('pointerout', onOut);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      tracks().forEach((inner) => {
        inner.style.transform = '';
      });
    };
  }, [loop]);

  useEffect(() => {
    if (keysActive) pausedRef.current = false;
  }, [keysActive]);

  return (
    <div className="absolute inset-0 z-20 bg-[#141821] text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-base text-white sm:px-10">No books for this country yet.</p>
      ) : (
        <section
          aria-label={
            loop
              ? `Books from ${country.name}, in diagonal stripes. Books travel along each stripe. Scroll to move through them. Arrow keys move along a stripe and between stripes. Enter opens one.`
              : `Books from ${country.name}. Arrow keys move across the shelf. Enter opens one.`
          }
          className="absolute inset-x-0 bottom-0 top-20 flex flex-col px-5 pt-3 sm:top-24 sm:px-8"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
            <header className="shrink-0 pb-4">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="text-balance text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  <span className="mr-2">{country.flag}</span>
                  {country.name}
                </h1>
                <p className="shrink-0 text-sm text-white/80">
                  {books.length === 1 ? '1 book' : `${books.length} books`}
                </p>
              </div>
              {country.tagline ? (
                <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-white/80">
                  {country.tagline}
                </p>
              ) : null}
            </header>

            <div
              ref={viewportRef}
              className={
                loop
                  ? 'shelf-loop relative min-h-0 flex-1 overflow-hidden'
                  : 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(4rem,env(safe-area-inset-bottom))]'
              }
            >
              {phase === 'intro' ? <ShelfIntro lines={introLines} onDone={finishIntro} /> : null}
              <div
                ref={trackRef}
                className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  phase === 'live' ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <div
                  className="absolute left-1/2 top-1/2 flex w-[175%] flex-col gap-3"
                  style={{ transform: `translate(-50%, -50%) rotate(${STRIP_ANGLE}deg)` }}
                >
                  {bookLines.map((line, lineIndex) => {
                    const lineIndexCursor = bookLines
                      .slice(0, lineIndex)
                      .reduce((sum, item) => sum + item.length, 0);
                    return (
                      <div key={lineIndex} data-strip className="overflow-hidden py-1">
                        <ol data-strip-track className="flex w-max gap-3">
                          {(loop ? [0, 1] : [0]).map((copy) =>
                            line.map((book, bookIndex) => {
                              const primary = copy === 0;
                              const index = primary ? lineIndexCursor + bookIndex : -1;
                              const coverSrc = book.cover || book.cover_url;
                              const coverFailed = !coverSrc || failedCovers[book.id];
                              return (
                              <li key={`${copy}-${book.id}-${bookIndex}`} className="shrink-0">
                                <button
                                  ref={
                                    primary
                                      ? (node) => {
                                          itemRefs.current[index] = node;
                                        }
                                      : undefined
                                  }
                                  type="button"
                                  data-book-row="true"
                                  tabIndex={!primary ? -1 : index === activeIndex ? 0 : -1}
                                  style={{ transform: `rotate(${-STRIP_ANGLE}deg)` }}
                                  onFocus={() => {
                                    activeIndexRef.current = index;
                                    setActiveIndex(index);
                                    pausedRef.current = true;
                                  }}
                                  onBlur={(event) => {
                                    const next = event.relatedTarget;
                                    if (!(next instanceof Element) || !next.closest('[data-book-row]')) {
                                      pausedRef.current = false;
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === ' ') event.preventDefault();
                                  }}
                                  onClick={(event) => {
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    onSelectBook?.(book, {
                                      left: rect.left,
                                      top: rect.top,
                                      width: rect.width,
                                      height: rect.height,
                                    });
                                  }}
                                  className="group flex h-[var(--card-h,9rem)] w-[var(--card-w,7.5rem)] origin-center flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                                >
                                  <span className="book-face cover-glow relative min-h-0 flex-1 overflow-hidden">
                                    {coverFailed ? (
                                      <span className="flex h-full items-end p-2">
                                        <span className="text-xs font-semibold leading-tight">{book.title}</span>
                                      </span>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={coverSrc}
                                        alt=""
                                        loading={primary && index < 12 ? 'eager' : 'lazy'}
                                        decoding="async"
                                        onError={() =>
                                          setFailedCovers((current) =>
                                            current[book.id] ? current : { ...current, [book.id]: true }
                                          )
                                        }
                                        className="h-full w-full object-contain"
                                      />
                                    )}
                                  </span>
                                  <span className="mt-1 block truncate text-xs font-semibold">{book.title}</span>
                                  <span className="block truncate text-[11px] leading-4 text-white/80">{book.author}</span>
                                </button>
                              </li>
                              );
                            }),
                          )}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function BackToGlobeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-4 top-4 z-[70] inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6 sm:top-5"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to globe
      <kbd className="rounded-md bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700">
        Esc
      </kbd>
    </button>
  );
}
