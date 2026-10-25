'use client';

import React from 'react';
import { Globe, Waves, Info, List, Compass, Sparkles } from 'lucide-react';

interface GlobeNavProps {
  currentView: 'globe' | 'ocean';
  onToggleView: (view: 'globe' | 'ocean') => void;
  onOpenAbout: () => void;
  onOpenCatalog: () => void;
}

export default function GlobeNav({
  currentView,
  onToggleView,
  onOpenAbout,
  onOpenCatalog,
}: GlobeNavProps) {
  return (
    <div className="absolute top-6 right-8 z-30 flex items-center gap-2 pointer-events-auto select-none">
      {/* View Switcher Pill */}
      <div className="flex items-center p-1 rounded-full bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/80 shadow-xl">
        <button
          onClick={() => onToggleView('globe')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            currentView === 'globe'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="3D Earth Globe by Country Origin"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Earth Globe</span>
        </button>

        <button
          onClick={() => onToggleView('ocean')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            currentView === 'ocean'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Infinite 3D Ocean of Books"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Ocean View</span>
        </button>
      </div>

      {/* Catalog & About Buttons */}
      <button
        onClick={onOpenCatalog}
        className="p-2 rounded-full bg-zinc-950/70 hover:bg-zinc-900 backdrop-blur-xl border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all shadow-xl"
        title="Browse Library Catalog"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        onClick={onOpenAbout}
        className="p-2 rounded-full bg-zinc-950/70 hover:bg-zinc-900 backdrop-blur-xl border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all shadow-xl"
        title="About Literary Earth"
      >
        <Info className="w-4 h-4" />
      </button>
    </div>
  );
}
