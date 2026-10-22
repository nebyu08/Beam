'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';
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
    focusedBook,
    setFocusedBook,
    selectedBook,
    setSelectedBook,
    selectRandomBook,
    filteredBooks,
  } = useBookStore();

  const [activeModal, setActiveModal] = useState<'about' | 'list' | 'details' | null>(null);
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
        if (loaded >= Math.min(10, initialCovers.length)) {
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
        e.preventDefault();
        const chosen = selectRandomBook();
        if (chosen) {
          setActiveModal('details');
        }
      } else if (e.key === 'Escape') {
        handleCloseDock();
      } else if (activeModal !== 'details') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (filteredBooks.length === 0) return;
          const currentIndex = filteredBooks.findIndex((b) => b.id === focusedBook?.id);
          const nextIndex = (currentIndex + 1) % filteredBooks.length;
          setFocusedBook(filteredBooks[nextIndex]);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (filteredBooks.length === 0) return;
          const currentIndex = filteredBooks.findIndex((b) => b.id === focusedBook?.id);
          const prevIndex = (currentIndex - 1 + filteredBooks.length) % filteredBooks.length;
          setFocusedBook(filteredBooks[prevIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, filteredBooks, focusedBook, handleCloseDock, selectRandomBook, setFocusedBook]);

  const handleSelectBook = useCallback(
    (book: Book) => {
      setSelectedBook(book);
      setActiveModal('details');
    },
    [setSelectedBook]
  );

  const handleLoadingFinished = useCallback(() => {
    // Select first book on load, elevate it towards viewer, and open its details dock
    const chosen = selectRandomBook();
    if (chosen) {
      setActiveModal('details');
    }
  }, [selectRandomBook]);

  const isDetailsDockOpen = activeModal === 'details' && !!selectedBook;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020712] text-zinc-100">
      {/* Interactive Endless Ocean Canvas in Top View */}
      <BookSphere
        onSelectBook={handleSelectBook}
        isDockOpen={isDetailsDockOpen}
        onCloseDock={handleCloseDock}
      />

      {/* Discreet Corner Toggle & Tools */}
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

      <BookListModal
        isOpen={activeModal === 'list'}
        onClose={() => setActiveModal(null)}
        onSelectBook={handleSelectBook}
      />

      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />

      {/* Intro Loading Screen with sequential dot ellipsis */}
      <LoadingScreen isReady={isReady} onFinished={handleLoadingFinished} />
    </main>
  );
}
