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

const DRIFT_PX_PER_SECOND = 28;

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

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
  const offsetRef = useRef(0);
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
      const half = track.scrollHeight / 2;
      if (!viewport || half <= 0) return;
      offsetRef.current = mod(viewport.clientHeight * 0.22 - item.offsetTop + half, half);
      pausedRef.current = true;
      offsetRef.current = mod(offsetRef.current, half);
      track.style.transform = `translate3d(0, ${-half + offsetRef.current}px, 0)`;
    };
  });

  useLayoutEffect(() => {
    if (!loop) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const applyOffset = () => {
      const half = track.scrollHeight / 2;
      if (half <= 0) return;
      offsetRef.current = mod(offsetRef.current, half);
      track.style.transform = `translate3d(0, ${-half + offsetRef.current}px, 0)`;
    };

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !document.hidden && keysActiveRef.current) {
        offsetRef.current += DRIFT_PX_PER_SECOND * dt;
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
      offsetRef.current += event.deltaY;
      applyOffset();
    };

    let dragY = 0;
    let originY = 0;
    let dragging = false;
    let dragged = false;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      dragged = false;
      dragY = event.clientY;
      originY = event.clientY;
      pausedRef.current = true;
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dy = event.clientY - dragY;
      dragY = event.clientY;
      if (Math.abs(event.clientY - originY) > 6) dragged = true;
      offsetRef.current += dy;
      applyOffset();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      pausedRef.current = document.activeElement instanceof Element
        && !!document.activeElement.closest('[data-book-row]');
      if (!dragged) return;
      const swallow = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        viewport.removeEventListener('click', swallow, true);
      };
      viewport.addEventListener('click', swallow, true);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onDown);
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
              ? `Books from ${country.name}. The shelf drifts downward and books return from the top. Arrow keys move across them. Enter opens one.`
              : `Books from ${country.name}. Arrow keys move across the shelf. Enter opens one.`
          }
          className="absolute inset-x-0 bottom-0 top-20 flex flex-col px-5 pt-3 sm:top-24 sm:px-8"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
            <header className="shrink-0 pb-6">
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                <span className="mr-2">{country.flag}</span>
                {country.name}
              </h1>
              {country.tagline ? (
                <p className="mt-3 max-w-prose text-pretty text-base leading-relaxed text-white/80">
                  {country.tagline}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-white/80">
                {books.length === 1 ? '1 book' : `${books.length} books`}
              </p>
            </header>

            <div
              ref={viewportRef}
              className={
                loop
                  ? 'shelf-loop relative min-h-0 flex-1 overflow-hidden'
                  : 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(4rem,env(safe-area-inset-bottom))]'
              }
            >
              <div ref={trackRef}>
                {[...(loop ? [true] : []), false].map((copy) => (
            <ol
              key={copy ? 'loop' : 'shelf'}
              aria-hidden={copy ? true : undefined}
              className="grid grid-cols-2 gap-x-4 gap-y-8 pb-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-y-10 lg:pb-10"
            >
              {books.map((book, index) => {
                const coverSrc = book.cover || book.cover_url;
                const coverFailed = !coverSrc || failedCovers[book.id];
                const year = yearLabel(book.year);
                const meta = [year, book.genre].filter(Boolean).join(' · ');

                return (
                  <li key={book.id}>
                    <button
                      ref={
                        copy
                          ? undefined
                          : (node) => {
                              itemRefs.current[index] = node;
                            }
                      }
                      type="button"
                      data-book-row="true"
                      tabIndex={copy ? -1 : index === activeIndex ? 0 : -1}
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
                      <span
                        className={`relative block overflow-hidden bg-black ${!copy && index < 12 ? 'cover-open' : ''}`}
                        style={!copy && index < 12 ? { animationDelay: `${index * 42}ms` } : undefined}
                      >
                        {coverFailed ? (
                          <span className="flex aspect-[2/3] w-full items-end bg-[#141416] p-3">
                            <span className="text-sm font-semibold leading-tight">{book.title}</span>
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt=""
                            loading={index < 8 ? 'eager' : 'lazy'}
                            decoding="async"
                            onError={() =>
                              setFailedCovers((current) =>
                                current[book.id] ? current : { ...current, [book.id]: true }
                              )
                            }
                            className="aspect-[2/3] h-auto w-full object-contain transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045] group-focus-visible:scale-[1.045] group-active:scale-[0.985] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
                          />
                        )}
                        {meta ? (
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-12 text-sm text-white opacity-0 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-opacity">
                            {meta}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 block min-h-[2.6em] text-balance text-sm font-semibold leading-snug line-clamp-2 sm:text-base">
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
