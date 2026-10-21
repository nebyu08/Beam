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
    <aside
      aria-label="Book details"
      className="fixed top-4 left-4 z-40 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-[390px] pointer-events-auto select-none animate-in fade-in slide-in-from-top-6 slide-in-from-left-6 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative rounded-3xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden min-h-[380px] flex flex-col justify-between text-zinc-100">
        {/* Full Cover Image Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-zinc-900">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="w-full h-full object-cover scale-105 filter brightness-90"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
          )}

          {/* Moody filmic gradient scrim so foreground text is crystal-clear */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/35" />
        </div>

        {/* Top Header Bar: Badges + Obvious Close Button */}
        <div className="relative z-10 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {/* Genre Badge */}
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-emerald-300 border border-emerald-500/30 shadow-md">
              {book.genre}
            </span>

            {/* Rating Score Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow-md">
              <Star className="w-3.5 h-3.5 fill-amber-300" />
              <span>{rating}% Score</span>
            </div>
          </div>

          {/* Prominent High-Contrast Close Button */}
          <button
            onClick={onClose}
            title="Close panel (Esc)"
            className="w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/30 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Bottom Content Area: Typography + Short Detail + Actions */}
        <div className="relative z-10 p-5 pt-8 flex flex-col">
          {/* Author & Year Tagline */}
          <p className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1 drop-shadow-md">
            <span>{book.author}</span>
            {book.year > 0 && (
              <>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-300 font-mono">({book.year})</span>
              </>
            )}
          </p>

          {/* Book Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-lg mb-2">
            {book.title}
          </h2>

          {/* Short Detail / Synopsis Snippet */}
          <p className="text-xs text-zinc-200/90 leading-relaxed line-clamp-3 drop-shadow mb-3">
            {book.description ||
              `A masterpiece of ${book.genre.toLowerCase()} literature exploring profound themes and timeless storytelling in the infinite library orbit.`}
          </p>

          {/* Theme Badges */}
          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {book.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[10px] text-zinc-300 font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Actions: Open Library Read Link + Explicit Close Button */}
          <div className="flex items-center gap-2 pt-1">
            {book.openlibrary_url ? (
              <a
                href={book.openlibrary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shadow-lg active:scale-98"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read on Open Library</span>
                <ExternalLink className="w-3 h-3 text-zinc-600" />
              </a>
            ) : null}

            {/* Explicit Close Button in Footer */}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white text-xs font-semibold border border-white/20 backdrop-blur-md transition-all active:scale-98"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
