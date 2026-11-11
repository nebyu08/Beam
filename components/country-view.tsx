'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoBook } from '@/lib/geo-types';
import { PopOrigin } from '@/components/book-details-modal';
import { ArrowLeft } from 'lucide-react';

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

const STRIP_ANGLE = -20;
const STRIP_RAD = (STRIP_ANGLE * Math.PI) / 180;
const DRIFT_X = -Math.cos(STRIP_RAD);
const DRIFT_Y = -Math.sin(STRIP_RAD);

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

export default function CountryView({
  country,
  keysActive = true,
  onSelectBook,
}: CountryViewProps) {
  const books = country.books;
  const [failedCovers, setFailedCovers] = useState<Record<number, true>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [lineCount, setLineCount] = useState(6);
  const [measured, setMeasured] = useState(false);
  const bookLines = lineUp(books, lineCount, 1);
  const bookLinesRef = useRef(bookLines);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const panClampRef = useRef<(x: number, y: number) => void>(() => {});
  const pausedRef = useRef(false);
  const keysActiveRef = useRef(keysActive);
  const placeBookRef = useRef<(index: number) => void>(() => {});
  const interactedRef = useRef(0);
  const liveRef = useRef(false);
  const drift = reduced === false && books.length > 1;

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
      const cardWidth = viewport.clientWidth >= 1100 ? 156 : 124;
      const rowHeight = Math.round(cardWidth * 1.5 + 40);
      const rad = (Math.abs(STRIP_ANGLE) * Math.PI) / 180;
      const along = cardWidth * Math.cos(rad) + rowHeight * Math.sin(rad);
      const acrossSpan = cardWidth * Math.sin(rad) + rowHeight * Math.cos(rad);
      const cardGap = Math.ceil(along - cardWidth + 20);
      const stripPad = Math.ceil((cardWidth * Math.sin(rad) - rowHeight * (1 - Math.cos(rad))) / 2 + 2);
      const stripGap = Math.max(12, Math.ceil(acrossSpan + 22 - rowHeight - stripPad * 2));
      viewport.style.setProperty('--card-h', `${rowHeight}px`);
      viewport.style.setProperty('--card-w', `${Math.round(cardWidth)}px`);
      viewport.style.setProperty('--card-gap', `${cardGap}px`);
      viewport.style.setProperty('--strip-gap', `${stripGap}px`);
      viewport.style.setProperty('--strip-pad', `${stripPad}px`);
      setLineCount((current) => (current === next ? current : next));
      setMeasured(true);
      liveRef.current = true;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [books.length]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

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
      const viewport = viewportRef.current;
      if (!item || !viewport) return;
      const view = viewport.getBoundingClientRect();
      const rect = item.getBoundingClientRect();
      const pad = 80;
      let dx = 0;
      let dy = 0;
      if (rect.left < view.left + pad) dx = view.left + pad - rect.left;
      else if (rect.right > view.right - pad) dx = view.right - pad - rect.right;
      if (rect.top < view.top + pad) dy = view.top + pad - rect.top;
      else if (rect.bottom > view.bottom - pad) dy = view.bottom - pad - rect.bottom;
      if (dx !== 0 || dy !== 0) {
        panClampRef.current(panRef.current.x + dx, panRef.current.y + dy);
      }
      interactedRef.current = performance.now();
      pausedRef.current = true;
    };
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const field = fieldRef.current;
    if (!viewport || !field) return;

    const paintPan = () => {
      field.style.transform = `translate(-50%, -50%) translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0)`;
    };
    const clampPan = (x: number, y: number) => {
      const board = boardRef.current;
      const width = board?.offsetWidth ?? 0;
      const height = board?.offsetHeight ?? 0;
      const cos = Math.cos(-STRIP_RAD);
      const sin = Math.sin(-STRIP_RAD);
      const edge = 96;
      const maxX = Math.max(0, width / 2 - edge);
      const maxY = Math.max(0, height / 2 - edge);
      const localX = Math.min(maxX, Math.max(-maxX, -x * cos + y * sin));
      const localY = Math.min(maxY, Math.max(-maxY, -x * sin - y * cos));
      panRef.current = {
        x: -(cos * localX + sin * localY),
        y: -(-sin * localX + cos * localY),
      };
      paintPan();
    };
    panClampRef.current = clampPan;
    clampPan(panRef.current.x, panRef.current.y);
    const board = boardRef.current;
    const observer = new ResizeObserver(() => clampPan(panRef.current.x, panRef.current.y));
    if (board) observer.observe(board);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const idle = now - interactedRef.current > 1200;
      if (
        drift &&
        idle &&
        !pausedRef.current &&
        !document.hidden &&
        keysActiveRef.current &&
        liveRef.current
      ) {
        clampPan(panRef.current.x + DRIFT_X * 22 * dt, panRef.current.y + DRIFT_Y * 22 * dt);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const wheelScale = (event: WheelEvent) => {
      if (event.deltaMode === 1) return 16;
      if (event.deltaMode === 2) return viewport.clientHeight;
      return 1;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      interactedRef.current = performance.now();
      const scale = wheelScale(event);
      clampPan(panRef.current.x - event.deltaX * scale, panRef.current.y - event.deltaY * scale);
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
      interactedRef.current = performance.now();
      viewport.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      dragX = event.clientX;
      dragY = event.clientY;
      if (Math.hypot(event.clientX - originX, event.clientY - originY) > 6) dragged = true;
      interactedRef.current = performance.now();
      clampPan(panRef.current.x + dx, panRef.current.y + dy);
    };
    const finishDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      const overBook = event.target instanceof Element && !!event.target.closest('[data-book-row]');
      const focused = document.activeElement instanceof Element
        && !!document.activeElement.closest('[data-book-row]');
      pausedRef.current = overBook || focused;
      if (!dragged) return;
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
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
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('pointerover', onOver);
    viewport.addEventListener('pointerout', onOut);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', finishDrag);
      viewport.removeEventListener('pointercancel', finishDrag);
      viewport.removeEventListener('pointerover', onOver);
      viewport.removeEventListener('pointerout', onOut);
    };
  }, [drift]);

  useEffect(() => {
    if (keysActive) pausedRef.current = false;
  }, [keysActive]);

  return (
    <div className="absolute inset-0 z-20 bg-[#1c1410] text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-base text-white sm:px-10">No books for this country yet.</p>
      ) : (
        <section
          aria-label={
            drift
              ? `Books from ${country.name}, in diagonal stripes. Scroll or drag to move around the shelf. Arrow keys move along a stripe and between stripes. Enter opens one.`
              : `Books from ${country.name}. Scroll or drag to move around the shelf. Arrow keys move across the shelf. Enter opens one.`
          }
          className="absolute inset-0"
        >
          <div className="absolute inset-0">
            <header className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#1c1410] via-[#1c1410]/75 to-transparent px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="text-balance text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {country.flag ? <span className="mr-2">{country.flag}</span> : null}
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
              className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
            >
              <div
                className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  measured ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <div
                  ref={fieldRef}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                <div
                  ref={boardRef}
                  className="flex w-max flex-col"
                  style={{
                    transform: `rotate(${STRIP_ANGLE}deg)`,
                    gap: 'var(--strip-gap, 1rem)',
                  }}
                >
                  {bookLines.map((line, lineIndex) => {
                    const lineIndexCursor = bookLines
                      .slice(0, lineIndex)
                      .reduce((sum, item) => sum + item.length, 0);
                    return (
                      <div
                        key={lineIndex}
                        data-strip
                        style={{ paddingBlock: 'var(--strip-pad, 1rem)' }}
                      >
                        <ol data-strip-track className="flex w-max" style={{ gap: 'var(--card-gap, 1rem)' }}>
                          {line.map((book, bookIndex) => {
                              const index = lineIndexCursor + bookIndex;
                              const coverSrc = book.cover || book.cover_url;
                              const coverFailed = !coverSrc || failedCovers[book.id];
                              return (
                              <li key={`${book.id}-${bookIndex}`} className="shrink-0">
                                <button
                                  ref={(node) => {
                                    itemRefs.current[index] = node;
                                  }}
                                  type="button"
                                  data-book-row="true"
                                  tabIndex={index === activeIndex ? 0 : -1}
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
                                        loading={index < 12 ? 'eager' : 'lazy'}
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
                            })}
                        </ol>
                      </div>
                    );
                  })}
                </div>
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
