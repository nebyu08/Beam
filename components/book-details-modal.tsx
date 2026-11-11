'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Book } from '@/lib/types';
import { BookOpen, ExternalLink, Globe, X } from 'lucide-react';

export type PopOrigin = { left: number; top: number; width: number; height: number };

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  countryName?: string;
  origin?: PopOrigin | null;
  onClose: () => void;
  onBackToGlobe?: () => void;
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
}: BookDetailsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coverFailureId, setCoverFailureId] = useState<number | null>(null);
  const [fetchedDetail, setFetchedDetail] = useState<{ id: number; text: string } | null>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !isOpen || !book || !origin) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const end = card.getBoundingClientRect();
    const dx = origin.left + origin.width / 2 - (end.left + end.width / 2);
    const dy = origin.top + origin.height / 2 - (end.top + end.height / 2);
    const sx = Math.min(1, Math.max(0.18, origin.width / end.width));
    const sy = Math.min(1, Math.max(0.18, origin.height / end.height));
    card.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: 'translate(0px, 0px) scale(1, 1)' },
      ],
      { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
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
        className="fixed inset-0 z-40 bg-black/80 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Book details"
        className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4"
      >
        <div
          ref={cardRef}
          className="pointer-events-auto flex max-h-[min(680px,calc(100vh-2rem))] w-full max-w-[420px] origin-center flex-col overflow-hidden rounded-[24px] border border-white/15 bg-black text-white shadow-[0_40px_90px_rgba(0,0,0,0.72)]"
        >
          <div className="relative flex justify-center bg-black px-5 pt-5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-4 w-4" />
            </button>
            {coverSrc && !coverFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt=""
                onError={() => setCoverFailureId(book.id)}
                className="max-h-[46vh] w-auto rounded-md object-contain"
              />
            ) : (
              <div className="flex aspect-[2/3] w-[220px] items-end bg-[#141416] p-5">
                <p className="text-xl font-semibold leading-tight">{book.title}</p>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em]">
                {book.title}
              </h2>
              <p className="mt-2 text-base leading-snug">{book.author}</p>
              {(year || book.genre) && (
                <p className="mt-1 text-sm text-white/80">
                  {[year, book.genre].filter(Boolean).join(', ')}
                </p>
              )}
              {(book.rating ?? 0) > 0 && <p className="mt-2 text-sm text-white/80">{book.rating}% rating</p>}
              <p className="mt-4 text-pretty text-sm leading-relaxed text-white/80">
                {detailLoading
                  ? 'Looking up this book…'
                  : detail ||
                    `${book.title} is a ${book.genre || 'book'} by ${book.author}${
                      year ? `, from ${year}` : ''
                    }${countryName ? `, filed under ${countryName}` : ''}.`}
              </p>
              {book.genres && book.genres.length > 0 && (
                <p className="mt-3 text-sm leading-relaxed text-white/80">{book.genres.slice(0, 4).join(', ')}</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {book.openlibrary_url && (
                <a
                  href={book.openlibrary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <BookOpen className="h-4 w-4" />
                  Read online
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {onBackToGlobe && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBackToGlobe();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Globe className="h-4 w-4" />
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
