'use client';

import React, { useMemo } from 'react';
import { GeoBook } from '@/lib/geo-types';
import { PopOrigin } from '@/components/book-details-modal';
import { useGeoStore } from '@/lib/geo-store';
import CountryView from '@/components/country-view';

interface WaveViewProps {
  keysActive?: boolean;
  onSelectBook?: (book: GeoBook, origin: PopOrigin) => void;
  onBackToGlobe?: () => void;
}

export default function WaveView({ keysActive = true, onSelectBook, onBackToGlobe }: WaveViewProps) {
  const countries = useGeoStore((state) => state.countries);
  const books = useMemo(() => countries.flatMap((country) => country.books), [countries]);
  const shelf = useMemo(
    () => ({
      name: 'Global Library',
      flag: '🌐',
      tagline: 'Every canonical work from across the world.',
      books,
    }),
    [books],
  );

  return (
    <CountryView
      country={shelf}
      keysActive={keysActive}
      onSelectBook={onSelectBook}
      onBackToGlobe={onBackToGlobe}
    />
  );
}
