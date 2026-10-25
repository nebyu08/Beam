'use client';

import React from 'react';
import { X, Sparkles, Move, MousePointer, ZoomIn, ExternalLink, Globe } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Atlas of World Literature
            </h3>
            <p className="text-xs text-zinc-400">
              Interactive 3D Earth Globe & Cultural Origins
            </p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mb-6 font-light">
          An interactive, minimalistic 3D Earth globe that organizes world literature by geographical and cultural origin. Spin the Earth to discover canonical masterpieces and Nobel-winning authors from Russia, Japan, Colombia, Nigeria, France, and beyond.
        </p>

        {/* Controls Guide */}
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
          Interactive Controls
        </h4>
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-zinc-300">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <Move className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">Click & Drag</p>
              <p className="text-[11px] text-zinc-400">Spin the Earth globe</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <ZoomIn className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">Scroll Wheel</p>
              <p className="text-[11px] text-zinc-400">Zoom in and out</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <MousePointer className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">Click Country</p>
              <p className="text-[11px] text-zinc-400">Deep-dive into authors</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-indigo-400 font-bold">
              ESC
            </kbd>
            <div>
              <p className="font-semibold text-white">Escape Key</p>
              <p className="text-[11px] text-zinc-400">Return to Earth Globe</p>
            </div>
          </div>
        </div>

        {/* Attribution & Credits */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>Data & Covers from Open Library</span>
          <a
            href="https://openlibrary.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors"
          >
            <span>openlibrary.org</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
