'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Book } from '@/lib/types';
import {
  BookOpen,
  ExternalLink,
  Globe,
  X,
  Star,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type PopOrigin = { left: number; top: number; width: number; height: number };

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  countryName?: string;
  origin?: PopOrigin | null;
  onClose: () => void;
  onBackToGlobe?: () => void;
  onNextBook?: () => void;
  onPrevBook?: () => void;
  clearOfBar?: boolean;
}

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export default function BookDetailsModal({
  isOpen,
  book,
  countryName,
  origin,
  onClose,
  onBackToGlobe,
  onNextBook,
  onPrevBook,
}: BookDetailsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coverFailureId, setCoverFailureId] = useState<number | null>(null);
  const [fetchedDetail, setFetchedDetail] = useState<{ id: number; text: string } | null>(null);
  const specular = { x: 42, y: 28 };

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !isOpen || !book || !origin) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const end = card.getBoundingClientRect();
      if (!end.width || !end.height) return;
      const dx = origin.left + origin.width / 2 - (end.left + end.width / 2);
      const dy = origin.top + origin.height / 2 - (end.top + end.height / 2);
      const sx = Math.min(1, Math.max(0.18, origin.width / end.width));
      const sy = Math.min(1, Math.max(0.18, origin.height / end.height));
      if (!isFinite(dx) || !isFinite(dy) || !isFinite(sx) || !isFinite(sy)) return;
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: 'translate(0px, 0px) scale(1, 1)' },
        ],
        { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    } catch {
      // safely fallback
    }
  }, [isOpen, book, origin]);

  useEffect(() => {
    const existing = book?.description?.trim();
    if (!book || !isOpen || existing) return;

    const controller = new AbortController();
    const bookId = book.id;
    const query = [book.title, book.author].filter(Boolean).join(' ');

    const run = async () => {
      try {
        const searchUrl = `https://openlibrary.org/search.json?${new URLSearchParams({
          q: query,
          limit: '1',
          fields: 'key,first_sentence',
        })}`;
        const search = await fetch(searchUrl, { signal: controller.signal });
        const found = await search.json();
        const doc = found?.docs?.[0];
        const sentence = doc?.first_sentence;
        const fromSearch = Array.isArray(sentence) ? sentence[0] : typeof sentence === 'string' ? sentence : '';
        const key = doc?.key as string | undefined;
        if (!key) {
          setFetchedDetail({ id: bookId, text: typeof fromSearch === 'string' ? fromSearch : '' });
          return;
        }
        const work = await fetch(`https://openlibrary.org${key}.json`, { signal: controller.signal });
        const record = await work.json();
        const raw = record?.description;
        const text = typeof raw === 'string' ? raw : raw?.value;
        const clean = typeof text === 'string' ? text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        setFetchedDetail({ id: bookId, text: clean || (typeof fromSearch === 'string' ? fromSearch : '') });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFetchedDetail({ id: bookId, text: '' });
      }
    };

    void run();
    return () => controller.abort();
  }, [book, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';
      if (typing) return;

      if (e.key === 'ArrowRight' && onNextBook) {
        e.preventDefault();
        onNextBook();
      } else if (e.key === 'ArrowLeft' && onPrevBook) {
        e.preventDefault();
        onPrevBook();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNextBook, onPrevBook]);

  if (!isOpen || !book) return null;

  const coverSrc = book.cover || book.cover_url;
  const coverFailed = coverFailureId === book.id;
  const year = yearLabel(book.year);
  const savedDetail = book.description?.trim() || '';
  const loadedDetail = fetchedDetail?.id === book.id ? fetchedDetail.text : '';
  const detail = savedDetail || loadedDetail;
  const detailLoading = !savedDetail && fetchedDetail?.id !== book.id;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Book details"
        className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4"
      >
        {/* Previous Book Button */}
        {onPrevBook && (
          <button
            type="button"
            onClick={onPrevBook}
            aria-label="Previous book"
            className="pointer-events-auto absolute left-3 sm:left-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next Book Button */}
        {onNextBook && (
          <button
            type="button"
            onClick={onNextBook}
            aria-label="Next book"
            className="pointer-events-auto absolute right-3 sm:right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 hover:bg-white text-zinc-300 hover:text-black border border-white/20 shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <div
          ref={cardRef}
          className="pointer-events-auto flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-[440px] origin-center flex-col overflow-hidden rounded-[28px] border border-white/20 bg-black/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_30px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        >
          {/* Header Bar with Quick Close & Country Badge */}
          <div className="relative flex items-center justify-between px-5 pt-4 z-20">
            {countryName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur-md">
                <Globe className="h-3.5 w-3.5 text-zinc-300" />
                {countryName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
                Canonical Library
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white border border-white/10 transition-all hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive 3D Book Showcase */}
          <div
            className="relative flex items-center justify-center pt-3 pb-2 px-6"
            style={{ perspective: '1100px' }}
          >
            {/* Ambient Backlight Glow behind Book */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="h-44 w-36 rounded-full bg-white/10 blur-3xl" />
            </div>

            {/* 3D Book Object */}
            <div
              className="relative select-none"
            >
              {/* The Hardcover Book Body */}
              <div className="relative max-h-[38vh] aspect-[2/3] w-auto min-w-[170px] max-w-[220px] overflow-hidden rounded-[6px] border border-white/25 bg-black shadow-[0_24px_50px_-10px_rgba(0,0,0,0.9)]">
                {coverSrc && !coverFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverSrc}
                    alt={book.title}
                    onError={() => setCoverFailureId(book.id)}
                    className="h-full w-full bg-black object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col justify-between bg-black p-4 text-zinc-100">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      {book.genre || 'Classic'}
                    </span>
                    <p className="text-lg font-bold leading-snug">{book.title}</p>
                    <p className="text-xs text-zinc-400">{book.author}</p>
                  </div>
                )}

                {/* Hardcover Spine Ridge & Crease (Left Edge) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/75 via-black/35 via-white/15 to-transparent shadow-[inset_1.5px_0_0_rgba(255,255,255,0.3)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3 w-[1px] bg-black/50 shadow-[1px_0_0_rgba(255,255,255,0.12)]"
                />

                {/* 3D Stacked Page Edges (Right Edge) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-[4px] border-l border-black/20 bg-gradient-to-r from-zinc-200 to-zinc-400"
                />

                {/* Dynamic Specular Light Glint */}
                <div
                  aria-hidden="true"
                  style={{
                    background: `radial-gradient(circle at ${specular.x}% ${specular.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 65%)`,
                  }}
                  className="pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-200"
                />

                {/* Satin Bookmark Ribbon dangling down */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 left-6 h-7 w-3 rounded-b-[2px] bg-zinc-200 shadow-md"
                />
              </div>

              {/* Ambient Floor Drop Shadow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 inset-x-3 h-4 rounded-full bg-black/70 blur-md"
              />
            </div>
          </div>

          {/* Book Content Details */}
          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-2">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {/* Title & Author */}
              <h2 className="text-balance text-2xl sm:text-3xl font-bold leading-[1.1] tracking-[-0.03em] text-white">
                {book.title}
              </h2>
              <p className="mt-1.5 text-base font-medium leading-snug text-zinc-300">
                {book.author}
              </p>

              {/* Badges Row: Year, Genre, Rating */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {year && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-mono text-zinc-200 border border-white/10">
                    <Calendar className="h-3 w-3 text-zinc-400" />
                    {year}
                  </span>
                )}
                {book.genre && (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200">
                    {book.genre}
                  </span>
                )}
                {(book.rating ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-xs text-zinc-200">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => {
                        const filled = (book.rating ?? 0) >= (i + 1) * 20;
                        return (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              filled ? 'fill-white text-white' : 'text-zinc-600'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span>{book.rating}% score</span>
                  </div>
                )}
              </div>

              {/* Description & Overview */}
              <div className="mt-4 text-pretty text-sm leading-relaxed text-zinc-300 font-light border-t border-white/10 pt-3">
                {detailLoading ? (
                  <div className="space-y-2 py-1 animate-pulse">
                    <div className="h-3 w-3/4 rounded bg-white/15" />
                    <div className="h-3 w-full rounded bg-white/10" />
                    <div className="h-3 w-5/6 rounded bg-white/10" />
                  </div>
                ) : (
                  <p>
                    {detail ||
                      `${book.title} is a celebrated work of ${book.genre || 'literature'} written by ${
                        book.author
                      }${year ? ` in ${year}` : ''}${
                        countryName ? `, representing ${countryName}` : ''
                      }.`}
                  </p>
                )}
              </div>

              {book.genres && book.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
                  {book.genres.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400 border border-white/5"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/10">
              {book.openlibrary_url && (
                <a
                  href={book.openlibrary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_4px_20px_rgba(255,255,255,0.12)] transition-colors hover:bg-zinc-200"
                >
                  <BookOpen className="h-4 w-4" />
                  Read online
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              )}
              {onBackToGlobe && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBackToGlobe();
                  }}
                  className="group inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 border border-white/15 hover:border-white/30 active:scale-[0.98] transition-all"
                >
                  <Globe className="h-4 w-4 text-zinc-300" />
                  Globe
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
