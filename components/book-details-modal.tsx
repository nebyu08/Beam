'use client';

import React from 'react';
import { Book } from '@/lib/types';
import { ExternalLink, X, BookOpen, Star, Calendar, Hash } from 'lucide-react';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

export default function BookDetailsModal({ isOpen, book, onClose }: BookDetailsModalProps) {
  if (!isOpen || !book) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Book Cover Visual */}
        <div className="w-full md:w-52 bg-zinc-900 flex-shrink-0 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-zinc-800/80">
          <div className="relative shadow-2xl rounded-lg overflow-hidden max-w-[160px] aspect-[2/3] border border-zinc-700/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.cover || book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Book Information */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {book.genre}
            </span>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-mono font-medium">{book.rating}%</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
            {book.title}
          </h3>
          <p className="text-sm font-medium text-zinc-400 mb-4">
            by {book.author}
          </p>

          {/* Quick Meta Stats */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-800/80 mb-4 text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>Published: {book.year > 0 ? book.year : 'Classic Edition'}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Hash className="w-4 h-4 text-zinc-500" />
              <span>{book.edition_count || 1} Editions</span>
            </div>
          </div>

          {/* Tags */}
          {book.genres && book.genres.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5">
                Topics & Themes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {book.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-2 flex items-center gap-3">
            <a
              href={book.openlibrary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-all shadow-md active:scale-98"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read on Open Library</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 text-zinc-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
