'use client';

import React from 'react';
import { Book } from '@/lib/types';
import { ExternalLink, X, BookOpen, Star } from 'lucide-react';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

export default function BookDetailsModal({ isOpen, book, onClose }: BookDetailsModalProps) {
  if (!isOpen || !book) return null;

  const coverSrc = book.cover || book.cover_url;
  const rating = book.rating || 85;

  return (
    <div
      className="fixed top-4 left-4 z-40 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-[410px] pointer-events-auto select-none animate-in fade-in slide-in-from-top-6 slide-in-from-left-6 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden p-5 flex flex-col gap-4 text-zinc-100">
        {/* Cover image blurred and darkened as the card background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none -z-10">
          {coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="w-full h-full object-cover scale-150 blur-3xl opacity-40 brightness-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/85 via-zinc-950/92 to-zinc-950/98 backdrop-blur-2xl" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close panel (Esc)"
          className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-white/10 active:scale-95 shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Row: Thumbnail + Core Metadata */}
        <div className="flex items-start gap-4 pr-7">
          {/* Cover Thumbnail */}
          <div className="w-16 h-24 rounded-lg overflow-hidden shadow-2xl border border-white/15 shrink-0 aspect-[2/3] bg-zinc-900">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 truncate max-w-[130px]">
                {book.genre}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{rating}%</span>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug line-clamp-2">
              {book.title}
            </h3>
            <p className="text-xs font-medium text-zinc-400 mt-0.5 truncate">
              {book.author} {book.year > 0 && <span className="text-zinc-500 font-mono">({book.year})</span>}
            </p>
          </div>
        </div>

        {/* Topic Pills */}
        {book.genres && book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-medium"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-1 flex items-center gap-2.5">
          {book.openlibrary_url ? (
            <a
              href={book.openlibrary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-md active:scale-98"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read on Open Library</span>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>
          ) : (
            <div className="flex-1 text-center py-2 text-xs text-zinc-500 font-mono">
              In infinite library orbit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
