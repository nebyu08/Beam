import { create } from 'zustand';
import { GeoCountry, GeoBook, AppViewMode } from './geo-types';
import geoBooksData from '../public/data/geo-books.json';

const defaultCountries = geoBooksData as unknown as GeoCountry[];

interface GeoStore {
  countries: GeoCountry[];
  activeCountry: GeoCountry | null;
  hoveredCountry: GeoCountry | null;
  appMode: AppViewMode;
  globeRotation: [number, number, number];
  targetRotation: [number, number, number] | null;
  selectedBook: GeoBook | null;
  isDetailOpen: boolean;

  setCountries: (countries: GeoCountry[]) => void;
  setActiveCountry: (country: GeoCountry | null) => void;
  setHoveredCountry: (country: GeoCountry | null) => void;
  setAppMode: (mode: AppViewMode) => void;
  setGlobeRotation: (rotation: [number, number, number]) => void;
  setTargetRotation: (rotation: [number, number, number] | null) => void;
  setSelectedBook: (book: GeoBook | null) => void;
  setIsDetailOpen: (open: boolean) => void;
  enterCountry: (country: GeoCountry) => void;
  exitToGlobe: () => void;
  selectRandomCountry: () => GeoCountry | null;
}

export const useGeoStore = create<GeoStore>((set, get) => ({
  countries: defaultCountries,
  activeCountry: null,
  hoveredCountry: null,
  appMode: 'globe',
  // Initial center slightly facing Europe/Eurasia/Africa:
  globeRotation: [-10, -25, 0],
  targetRotation: null,
  selectedBook: null,
  isDetailOpen: false,

  setCountries: (countries) => set({ countries }),
  setActiveCountry: (activeCountry) => set({ activeCountry }),
  setHoveredCountry: (hoveredCountry) => set({ hoveredCountry }),
  setAppMode: (appMode) => set({ appMode }),
  setGlobeRotation: (globeRotation) => set({ globeRotation }),
  setTargetRotation: (targetRotation) => set({ targetRotation }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  setIsDetailOpen: (isDetailOpen) => set({ isDetailOpen }),

  enterCountry: (country) => {
    // Slerp globe to center on country's view coordinates before switching
    set({
      activeCountry: country,
      targetRotation: [-country.viewLng, -country.viewLat, 0],
      appMode: 'country',
      hoveredCountry: null,
    });
  },

  exitToGlobe: () => {
    const { activeCountry } = get();
    set({
      appMode: 'globe',
      hoveredCountry: activeCountry,
      activeCountry: null,
      selectedBook: null,
      isDetailOpen: false,
    });
  },

  selectRandomCountry: () => {
    const { countries } = get();
    if (countries.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * countries.length);
    const chosen = countries[randomIndex];
    get().enterCountry(chosen);
    return chosen;
  },
}));
