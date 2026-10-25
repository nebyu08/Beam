import { Book } from './types';

export interface GeoBook extends Book {
  country: string;
  countryCode: string;
  countryId: string;
  countryFlag: string;
  city?: string;
  lat: number;
  lng: number;
}

export interface GeoCountry {
  id: string; // TopoJSON numeric/string ID (e.g. "643" for Russia)
  name: string;
  code: string; // ISO 3166-1 alpha-2 (e.g. "RU")
  flag: string; // Emoji flag (e.g. "🇷🇺")
  lat: number; // Geographical center lat
  lng: number; // Geographical center lng
  viewLat: number; // Focus latitude (cultural center/capital)
  viewLng: number; // Focus longitude (cultural center/capital)
  title: string;
  tagline: string;
  authors: string[];
  books: GeoBook[];
}

export type AppViewMode = 'globe' | 'country';
