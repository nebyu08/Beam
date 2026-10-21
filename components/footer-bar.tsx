'use client';

import React from 'react';
import { useBookStore } from '@/lib/book-store';

export default function FooterBar() {
  const { filteredBooks, focusedBook } = useBookStore();

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none select-none text-zinc-500 text-xs">
      {/* Keyboard hints */}
      <div className="flex items-center gap-4 text-[11px] font-mono">
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            DRAG
          </kbd>{' '}
          Pan / Rotate
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            SCROLL
          </kbd>{' '}
          Zoom
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            SPACE
          </kbd>{' '}
          Surprise
        </span>
      </div>

      {/* Status */}
      <div className="text-[11px] font-mono text-zinc-400">
        {focusedBook ? (
          <span>
            Focused:{' '}
            <strong className="text-zinc-300 font-normal">
              {focusedBook.title.slice(0, 24)}...
            </strong>
          </span>
        ) : (
          <span>Explore sphere</span>
        )}
      </div>
    </footer>
  );
}
