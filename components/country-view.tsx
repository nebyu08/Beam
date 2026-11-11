'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  keysActive?: boolean;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

const DRIFT_PX_PER_SECOND = 22;

function mod(value: number, size: number) {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
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
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const pausedRef = useRef(false);
  const keysActiveRef = useRef(keysActive);
  const placeBookRef = useRef<(index: number) => void>(() => {});
  const loop = reduced === false && books.length > 1;

  useEffect(() => {
    keysActiveRef.current = keysActive;
  }, [keysActive]);

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

    const columnCount = () => {
      const nodes = itemRefs.current.filter((node): node is HTMLButtonElement => node !== null);
      if (nodes.length < 2) return 1;
      const top = nodes[0].getBoundingClientRect().top;
      let count = 1;
      for (let index = 1; index < nodes.length; index += 1) {
        if (Math.abs(nodes[index].getBoundingClientRect().top - top) > 12) break;
        count += 1;
      }
      return count;
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
      const columns = columnCount();
      const next =
        key === 'ArrowRight'
          ? Math.min(books.length - 1, current + 1)
          : key === 'ArrowLeft'
            ? Math.max(0, current - 1)
            : key === 'ArrowDown'
              ? Math.min(books.length - 1, current + columns)
              : key === 'ArrowUp'
                ? Math.max(0, current - columns)
                : key === 'Home'
                  ? 0
                  : books.length - 1;
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
      if (!loop || !track) {
        item.scrollIntoView({ block: 'nearest' });
        return;
      }
      const viewport = viewportRef.current;
      const halfW = track.scrollWidth / 2;
      const halfH = track.scrollHeight / 2;
      if (!viewport || halfW <= 0 || halfH <= 0) return;
      offsetXRef.current = mod(item.offsetLeft - 12, halfW);
      offsetYRef.current = mod(viewport.clientHeight * 0.18 - item.offsetTop + halfH, halfH);
      pausedRef.current = true;
      track.style.transform = `translate3d(${-offsetXRef.current}px, ${-halfH + offsetYRef.current}px, 0)`;
    };
  });

  useLayoutEffect(() => {
    if (!loop) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const applyOffset = () => {
      const halfW = track.scrollWidth / 2;
      const halfH = track.scrollHeight / 2;
      if (halfW <= 0 || halfH <= 0) return;
      offsetXRef.current = mod(offsetXRef.current, halfW);
      offsetYRef.current = mod(offsetYRef.current, halfH);
      track.style.transform = `translate3d(${-offsetXRef.current}px, ${-halfH + offsetYRef.current}px, 0)`;
    };

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !document.hidden && keysActiveRef.current) {
        offsetXRef.current += DRIFT_PX_PER_SECOND * dt;
        offsetYRef.current += DRIFT_PX_PER_SECOND * dt;
        applyOffset();
      }
      frame = requestAnimationFrame(tick);
    };
    applyOffset();
    frame = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => applyOffset());
    observer.observe(track);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY + event.deltaX;
      offsetXRef.current += delta;
      offsetYRef.current += delta;
      applyOffset();
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
      offsetXRef.current -= dx;
      offsetYRef.current += dy;
      applyOffset();
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
      track.style.transform = '';
    };
  }, [loop]);

  useEffect(() => {
    if (keysActive) pausedRef.current = false;
  }, [keysActive]);

  return (
    <div className="absolute inset-0 z-20 bg-black text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-base text-white sm:px-10">No books for this country yet.</p>
      ) : (
        <section
          aria-label={
            loop
              ? `Books from ${country.name}. Books drift from the upper right toward the lower left. Scroll to move through them. Arrow keys move across them. Enter opens one.`
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
              <div ref={trackRef} className={loop ? 'relative grid w-[200%] grid-cols-2' : undefined}>
                {(loop ? [0, 1, 2, 3] : [0]).map((copy) => (
                  <ol
                    key={copy}
                    aria-hidden={copy === 0 ? undefined : true}
                    className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-5 pr-4 pb-5"
                  >
                    {books.map((book, index) => {
                      const coverSrc = book.cover || book.cover_url;
                      const coverFailed = !coverSrc || failedCovers[book.id];
                      const primary = copy === 0;

                      return (
                        <li key={book.id} className="min-w-0">
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
                            onClick={() => onSelectBook?.(book)}
                            className="group block w-full scroll-mt-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                          >
                            <span className="cover-glow relative block overflow-hidden bg-black">
                              {coverFailed ? (
                                <span className="flex aspect-[2/3] w-full items-end bg-[#141416] p-3">
                                  <span className="text-sm font-semibold leading-tight">{book.title}</span>
                                </span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={coverSrc}
                                  alt=""
                                  loading={primary && index < 8 ? 'eager' : 'lazy'}
                                  decoding="async"
                                  onError={() =>
                                    setFailedCovers((current) =>
                                      current[book.id] ? current : { ...current, [book.id]: true }
                                    )
                                  }
                                  className="aspect-[2/3] h-auto w-full object-contain"
                                />
                              )}
                            </span>
                            <span className="mt-2 block min-h-[2.5em] text-balance text-sm font-semibold leading-snug line-clamp-2">
                              {book.title}
                            </span>
                            <span className="mt-1 block truncate text-sm text-white/80">{book.author}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ))}
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
