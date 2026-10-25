'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { useGeoStore } from '@/lib/geo-store';
import { Book } from '@/lib/types';
import EarthGlobe from '@/components/earth-globe';
import CountryView from '@/components/country-view';
import GlobeNav from '@/components/globe-nav';
import BookSphere from '@/components/book-sphere';
import BookHeader from '@/components/book-header';
import FooterBar from '@/components/footer-bar';
import BookDetailsModal from '@/components/book-details-modal';
import BookListModal from '@/components/book-list-modal';
import AboutModal from '@/components/about-modal';
import LoadingScreen from '@/components/loading-screen';

export default function Home() {
  const {
    books,
    setBooks,
    selectedBook,
    setSelectedBook,
    selectRandomBook,
  } = useBookStore();

  const {
    countries,
    activeCountry,
    hoveredCountry,
    appMode,
    enterCountry,
    exitToGlobe,
    setHoveredCountry,
    selectRandomCountry,
  } = useGeoStore();

  const [activeModal, setActiveModal] = useState<'about' | 'list' | 'details' | null>(null);
  const [viewMode, setViewMode] = useState<'globe' | 'ocean'>('globe');
  const [isReady, setIsReady] = useState(false);

  // Preload initial visible batch of covers for smooth entrance
  useEffect(() => {
    if (books.length === 0) return;
    const initialCovers = books
      .slice(0, 24)
      .map((b) => b.cover || b.cover_url)
      .filter(Boolean) as string[];

    if (initialCovers.length === 0) {
      setIsReady(true);
      return;
    }

    let loaded = 0;
    initialCovers.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= Math.min(8, initialCovers.length)) {
          setIsReady(true);
        }
      };
    });
  }, [books]);

  // Sync books from /data/books.json when updated
  useEffect(() => {
    async function syncBooks() {
      try {
        const res = await fetch('/data/books.json');
        if (res.ok) {
          const data: Book[] = await res.json();
          if (data && data.length > books.length) {
            setBooks(data);
          }
        }
      } catch (e) {
        // use default preloaded books
      }
    }
    syncBooks();
  }, [books.length, setBooks]);

  const handleCloseDock = useCallback(() => {
    setActiveModal(null);
    setSelectedBook(null);
  }, [setSelectedBook]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        if (viewMode === 'globe' && appMode === 'globe') {
          e.preventDefault();
          selectRandomCountry();
        } else if (viewMode === 'ocean') {
          e.preventDefault();
          const chosen = selectRandomBook();
          if (chosen) {
            setActiveModal('details');
          }
        }
      } else if (e.key === 'Escape') {
        if (activeModal) {
          handleCloseDock();
        } else if (viewMode === 'globe' && appMode === 'country') {
          exitToGlobe();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeModal,
    viewMode,
    appMode,
    handleCloseDock,
    selectRandomCountry,
    selectRandomBook,
    exitToGlobe,
  ]);

  const handleSelectBook = useCallback(
    (book: Book) => {
      setSelectedBook(book);
      setActiveModal('details');
    },
    [setSelectedBook]
  );

  const handleLoadingFinished = useCallback(() => {
    // Finished loading screen
  }, []);

  const isDetailsDockOpen = activeModal === 'details' && !!selectedBook;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020612] text-zinc-100">
      {viewMode === 'globe' ? (
        appMode === 'country' && activeCountry ? (
          <CountryView
            country={activeCountry}
            onBackToGlobe={exitToGlobe}
            onSelectBook={(b) => setSelectedBook(b as unknown as Book)}
          />
        ) : (
          <>
            <EarthGlobe
              countries={countries}
              onSelectCountry={enterCountry}
              hoveredCountry={hoveredCountry}
              onHoverCountry={setHoveredCountry}
            />
            <GlobeNav
              currentView="globe"
              onToggleView={setViewMode}
              onOpenAbout={() => setActiveModal('about')}
              onOpenCatalog={() => setActiveModal('list')}
            />
          </>
        )
      ) : (
        <>
          {/* Interactive Endless Ocean Canvas in Top View */}
          <BookSphere
            onSelectBook={handleSelectBook}
            isDockOpen={isDetailsDockOpen}
            onCloseDock={handleCloseDock}
          />

          <GlobeNav
            currentView="ocean"
            onToggleView={setViewMode}
            onOpenAbout={() => setActiveModal('about')}
            onOpenCatalog={() => setActiveModal('list')}
          />

          {/* Discreet Corner Toggle & Tools for Ocean */}
          <BookHeader
            onOpenAbout={() => setActiveModal('about')}
            onOpenList={() => setActiveModal('list')}
          />

          {/* Bottom Hint Bar */}
          <FooterBar />

          {/* Top-Left Sliding Book Detail Card with Cover Background */}
          <BookDetailsModal
            isOpen={isDetailsDockOpen}
            book={selectedBook}
            onClose={handleCloseDock}
          />
        </>
      )}

      {/* Shared Modals */}
      <BookListModal
        isOpen={activeModal === 'list'}
        onClose={() => setActiveModal(null)}
        onSelectBook={handleSelectBook}
      />

      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />

      {/* Intro Loading Screen */}
      <LoadingScreen isReady={isReady} onFinished={handleLoadingFinished} />
    </main>
  );
}
