'use client';

import React, { useState } from 'react';
import { Book } from '@/lib/types';
import { useBookStore } from '@/lib/book-store';
import { X, Search, Star, ExternalLink } from 'lucide-react';

interface BookListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
}

export default function BookListModal({
  isOpen,
  onClose,
  onSelectBook,
}: BookListModalProps) {
  const { filteredBooks, setFocusedBook, setSelectedBook } = useBookStore();
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const displayBooks = filteredBooks.filter(
    (b) =>
      b.title.toLowerCase().includes(filter.toLowerCase()) ||
      b.author.toLowerCase().includes(filter.toLowerCase()) ||
      b.genre.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative max-w-4xl w-full h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Library Catalog
            </h3>
            <p className="text-xs text-zinc-400">
              Showing {displayBooks.length} of {filteredBooks.length} books
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter titles or authors..."
                className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full"
              />
              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-mono ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Book Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => {
                setFocusedBook(book);
                setSelectedBook(book);
                onSelectBook(book);
                onClose();
              }}
              className="group cursor-pointer flex flex-col bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800/60 hover:border-zinc-700 rounded-xl p-2.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Cover Thumbnail */}
              <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900 mb-2 border border-zinc-800 relative shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.cover || book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono font-semibold text-emerald-300 flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                  {book.rating}%
                </div>
              </div>

              {/* Title & Author */}
              <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white mb-0.5">
                {book.title}
              </h4>
              <p className="text-[11px] text-zinc-400 line-clamp-1 mb-1">
                {book.author}
              </p>

              <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>{book.year > 0 ? book.year : '—'}</span>
                <span className="text-zinc-400">{book.genre}</span>
              </div>
            </div>
          ))}

          {displayBooks.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-500">
              No books found matching &quot;{filter}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
