'use client';

import React, { useEffect, useState } from 'react';
import { Book } from '@/lib/types';
import { ArrowLeft, BookOpen, ExternalLink, Globe, X } from 'lucide-react';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  countryName?: string;
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
  onClose,
  onBackToGlobe,
}: BookDetailsModalProps) {
  const [coverFailureId, setCoverFailureId] = useState<number | null>(null);
  const [fetchedDetail, setFetchedDetail] = useState<{ id: number; text: string } | null>(null);

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
        className="fixed inset-0 z-40 bg-black/45 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Book details"
        className="pointer-events-none fixed inset-0 z-40 flex justify-end p-3 sm:p-5"
      >
        <div className="pointer-events-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] bg-[#0c0c0e] text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:flex-row">
          <div className="flex w-full shrink-0 items-center justify-center bg-black px-6 py-8 sm:w-[340px] sm:px-8">
            {coverSrc && !coverFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt=""
                onError={() => setCoverFailureId(book.id)}
                className="aspect-[2/3] h-auto w-[min(100%,280px)] rounded-md object-contain shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:w-[min(100%,320px)]"
              />
            ) : (
              <div className="flex aspect-[2/3] w-[min(100%,280px)] items-end bg-[#1a1a1d] p-6 sm:w-[320px]">
                <p className="text-2xl font-semibold leading-tight">{book.title}</p>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 py-5 sm:px-8 sm:py-7">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {countryName || 'Books'}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
                {book.title}
              </h2>
              <p className="mt-4 text-lg leading-snug">{book.author}</p>
              {(year || book.genre) && (
                <p className="mt-1 text-base">
                  {[year, book.genre].filter(Boolean).join(', ')}
                </p>
              )}
              {(book.rating ?? 0) > 0 && <p className="mt-3 text-sm">{book.rating}% rating</p>}
              <div className="mt-6 border-t border-white/15 pt-5">
                <h3 className="text-sm font-semibold">About this book</h3>
                <p className="mt-3 max-w-prose text-pretty text-base leading-relaxed">
                  {detailLoading
                    ? 'Looking up this book…'
                    : detail ||
                      `${book.title} is a ${book.genre || 'book'} by ${book.author}${
                        year ? `, from ${year}` : ''
                      }${countryName ? `, filed under ${countryName}` : ''}.`}
                </p>
              </div>
              {book.genres && book.genres.length > 0 && (
                <p className="mt-5 text-sm leading-relaxed">{book.genres.slice(0, 4).join(', ')}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
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
