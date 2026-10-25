'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';
import { GeoCountry } from '@/lib/geo-types';

interface BookSphereProps {
  books?: Book[];
  activeCountry?: GeoCountry | null;
  onSelectBook?: (book: Book) => void;
  isDockOpen?: boolean;
  onCloseDock?: () => void;
  onBackToGlobe?: () => void;
}

export default function BookSphere({
  books,
  activeCountry,
  onSelectBook,
  isDockOpen = false,
  onCloseDock,
  onBackToGlobe,
}: BookSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const currentPreviewIdRef = useRef<number | null>(null);
  const floatingPreviewElRef = useRef<HTMLDivElement | null>(null);
  const floatingPosRef = useRef({ x: -9999, y: -9999, opacity: 0 });

  const filteredBooks = useBookStore((s) => s.filteredBooks);
  const currentBooks = books && books.length > 0 ? books : filteredBooks;
  const booksRef = useRef<Book[]>(currentBooks);
  booksRef.current = currentBooks;

  const focusedBook = useBookStore((s) => s.focusedBook);
  const focusedBookRef = useRef<Book | null>(focusedBook);
  focusedBookRef.current = focusedBook;

  const selectedBook = useBookStore((s) => s.selectedBook);
  const selectedBookRef = useRef<Book | null>(selectedBook);
  selectedBookRef.current = selectedBook;

  // Elevation pull progress for the selected book (0 = in ocean, 1 = pulled up towards viewer)
  const pullProgressRef = useRef(0);

  // Bubble-up entrance progress on initial load (0 = submerged in abyss, 1 = surfaced)
  const bubbleEntranceRef = useRef(0);

  // When active country or book set changes, reset entrance so books bubble up into the ocean
  useEffect(() => {
    bubbleEntranceRef.current = 0;
    if (currentBooks.length > 0) {
      const hero = currentBooks[0];
      useBookStore.getState().setSelectedBook(hero);
      useBookStore.getState().setFocusedBook(hero);
      pullProgressRef.current = 1.0;
    }
  }, [activeCountry, books]);

  // Continuous simulation time for living, breathing ocean waves (never paused!)
  const simTimeRef = useRef(0);

  // Infinite Ocean Camera & Physics state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetVx: 0,
    targetVy: 0,
    targetX: null as number | null,
    targetY: null as number | null,
    zoom: 0.48,
    targetZoom: 0.48,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCamStartX: 0,
    dragCamStartY: 0,
    lastDragX: 0,
    lastDragY: 0,
    lastDragTime: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    lensX: 0,
    lensY: 0,
    hasActiveMouse: false,
    lastPointerMoveTime: 0,
    lastClientX: 0,
    lastClientY: 0,
    motionIntensity: 1.0,
    width: 0,
    height: 0,
  });

  // Cached image elements
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Preload covers
  useEffect(() => {
    if (!currentBooks || currentBooks.length === 0) return;

    currentBooks.forEach((book) => {
      const src = book.cover || book.cover_url;
      if (!src || imagesRef.current.has(src)) return;

      const img = new Image();
      img.src = src;
      img.onload = () => {
        imagesRef.current.set(src, img);
      };
      img.onerror = () => {
        if (book.cover_url && src !== book.cover_url) {
          const fallback = new Image();
          fallback.src = book.cover_url;
          fallback.onload = () => {
            imagesRef.current.set(src, fallback);
          };
        }
      };
    });
  }, [currentBooks]);

  // Center camera on book when selected (e.g. initial random pick, Surprise Me, or click)
  const lastCenteringIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedBook) return;
    if (lastCenteringIdRef.current === selectedBook.id) return;
    lastCenteringIdRef.current = selectedBook.id;

    currentPreviewIdRef.current = selectedBook.id;
    setPreviewBook(selectedBook);

    const books = booksRef.current;
    const index = books.findIndex((b) => b.id === selectedBook.id);
    if (index === -1) return;

    const cols = 20;
    const col = index % cols;
    const row = Math.floor(index / cols);

    const targetZoom = 0.92;
    const stepX = 78 * targetZoom;
    const stepY = 112 * targetZoom;

    const targetX = -(col * stepX + ((row % 2) * stepX * 0.5));
    const targetY = -(row * stepY);

    cameraRef.current.targetX = targetX;
    cameraRef.current.targetY = targetY;
    cameraRef.current.targetVx = 0;
    cameraRef.current.targetVy = 0;
    cameraRef.current.targetZoom = targetZoom;

    const canvas = canvasRef.current;
    const w = canvas?.width || 800;
    const h = canvas?.height || 600;

    // Center lens directly onto the book
    cameraRef.current.hasActiveMouse = true;
    cameraRef.current.lensX = w / 2;
    cameraRef.current.lensY = h / 2;
    cameraRef.current.mouseX = w / 2;
    cameraRef.current.mouseY = h / 2;
    cameraRef.current.targetMouseX = w / 2;
    cameraRef.current.targetMouseY = h / 2;
  }, [selectedBook]);

  // Handle Resize using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(rect.width, 320);
      const h = Math.max(rect.height, 320);

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      cameraRef.current.width = w * dpr;
      cameraRef.current.height = h * dpr;

      if (!cameraRef.current.hasActiveMouse) {
        cameraRef.current.mouseX = (w * dpr) / 2;
        cameraRef.current.mouseY = (h * dpr) / 2;
        cameraRef.current.targetMouseX = cameraRef.current.mouseX;
        cameraRef.current.targetMouseY = cameraRef.current.mouseY;
        cameraRef.current.lensX = cameraRef.current.mouseX;
        cameraRef.current.lensY = cameraRef.current.mouseY;
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Main 60FPS Endless Ocean Top-View Render Loop with Mountain Stacking Architecture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let lastHoverCheckTime = 0;

    const render = (time: number) => {
      const dt = Math.min(32, Math.max(8, time - lastTime));
      lastTime = time;

      // Always advance ocean simulation time so the breathing waves never stop!
      simTimeRef.current += dt;
      const animTime = simTimeRef.current;

      const cam = cameraRef.current;
      const width = canvas.width || 800;
      const height = canvas.height || 600;

      const screenCenterX = width / 2;
      const screenCenterY = height / 2;

      // Initial bubble-up entrance progress (smoothly bubbles up from ocean depths on load)
      if (bubbleEntranceRef.current < 0.999) {
        bubbleEntranceRef.current += (1.0 - bubbleEntranceRef.current) * 0.035;
        if (bubbleEntranceRef.current > 0.995) bubbleEntranceRef.current = 1.0;
      }
      const bubbleEntrance = bubbleEntranceRef.current;

      // Animate Elevation Pull Progress for the Selected Hero Book
      const targetPull = selectedBookRef.current ? 1.0 : 0.0;
      pullProgressRef.current += (targetPull - pullProgressRef.current) * 0.075;
      const pullProgress = pullProgressRef.current;

      // Smooth mouse tracking
      if (cam.hasActiveMouse) {
        cam.mouseX += (cam.targetMouseX - cam.mouseX) * 0.2;
        cam.mouseY += (cam.targetMouseY - cam.mouseY) * 0.2;
        cam.lensX += (cam.mouseX - cam.lensX) * 0.22;
        cam.lensY += (cam.mouseY - cam.lensY) * 0.22;
      }

      // Fluid Viewport Navigation:
      // When moving mouse towards an edge, view glides in that direction.
      // When mouse rests (stopped for > 220ms), camera halts completely.
      const timeSinceMove = time - cam.lastPointerMoveTime;

      if (!isDockOpen && !cam.isDragging && cam.hasActiveMouse) {
        if (timeSinceMove < 240) {
          const activeRatio = Math.max(0, 1.0 - timeSinceMove / 240);
          const normX = (cam.mouseX - screenCenterX) / screenCenterX;
          const normY = (cam.mouseY - screenCenterY) / screenCenterY;
          const distFromCenter = Math.hypot(normX, normY);

          if (distFromCenter > 0.06) {
            const intensity = Math.pow(Math.min(1.0, (distFromCenter - 0.06) / 0.94), 1.15);
            const cruiseSpeed = 22.0 * Math.max(0.65, cam.zoom) * cam.motionIntensity;
            cam.targetVx = -(normX / distFromCenter) * intensity * cruiseSpeed * activeRatio;
            cam.targetVy = -(normY / distFromCenter) * intensity * cruiseSpeed * activeRatio;
          } else {
            cam.targetVx = 0;
            cam.targetVy = 0;
          }
        } else {
          cam.targetVx = 0;
          cam.targetVy = 0;
        }
      } else {
        cam.targetVx = 0;
        cam.targetVy = 0;
      }

      // If manual dragging or edge-flying, cancel auto-swoop
      if (cam.isDragging || Math.abs(cam.targetVx) > 0.2 || Math.abs(cam.targetVy) > 0.2) {
        cam.targetX = null;
        cam.targetY = null;
      }

      // Smooth camera swoop towards selected book coordinates
      if (cam.targetX !== null && cam.targetY !== null && !cam.isDragging) {
        const diffX = cam.targetX - cam.x;
        const diffY = cam.targetY - cam.y;
        cam.x += diffX * 0.07;
        cam.y += diffY * 0.07;
        if (Math.hypot(diffX, diffY) < 1.0) {
          cam.x = cam.targetX;
          cam.y = cam.targetY;
          cam.targetX = null;
          cam.targetY = null;
        }
      }

      // Physics integration with fluid damping
      if (!cam.isDragging) {
        const isResting = Math.abs(cam.targetVx) < 0.01 && Math.abs(cam.targetVy) < 0.01;
        const damping = isResting ? 0.84 : 0.09;
        cam.vx += (cam.targetVx - cam.vx) * damping;
        cam.vy += (cam.targetVy - cam.vy) * damping;

        cam.x += cam.vx * (dt / 16);
        cam.y += cam.vy * (dt / 16);

        if (isResting && Math.abs(cam.vx) < 0.02) cam.vx = 0;
        if (isResting && Math.abs(cam.vy) < 0.02) cam.vy = 0;
      }

      // Smooth zoom interpolation
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.055;

      // Abyssal Ocean Top-View Background (Pure Monochrome Black)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Deep Ocean Ambient Glow (Monochrome Vignette)
      const oceanAmbient = ctx.createRadialGradient(
        cam.lensX,
        cam.lensY,
        50,
        cam.lensX,
        cam.lensY,
        Math.max(width, height) * 0.88
      );
      oceanAmbient.addColorStop(0, '#1a1a1a');
      oceanAmbient.addColorStop(0.4, '#0f0f0f');
      oceanAmbient.addColorStop(0.75, '#060606');
      oceanAmbient.addColorStop(1, '#000000');
      ctx.fillStyle = oceanAmbient;
      ctx.fillRect(0, 0, width, height);

      const books = booksRef.current;
      const booksCount = books.length;

      if (booksCount === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      interface OceanBookItem {
        book: Book;
        screenX: number;
        screenY: number;
        w: number;
        h: number;
        elevation: number;
        isSelectedHero: boolean;
        isHoverApex: boolean;
        slopeAngle: number;
        opacity: number;
      }

      const drawList: OceanBookItem[] = [];
      const isCountryMode = Boolean(activeCountry);

      let hoverApexBook: Book | null = isDockOpen ? selectedBookRef.current : null;
      let minApexDist = Infinity;
      let hoverApexCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };

      if (isCountryMode) {
        // =========================================================================
        // COUNTRY MODE: RENDER EXACT REGIONAL BOOKS ONCE (NO ENDLESS REPETITION)
        // =========================================================================
        const cardW = 135 * cam.zoom;
        const cardH = 195 * cam.zoom;
        const stepX = 168 * cam.zoom;
        const stepY = 230 * cam.zoom;

        // 1. FAST PRE-PASS: Find the book closest to cursor
        if (!isDockOpen && cam.hasActiveMouse) {
          for (let i = 0; i < booksCount; i++) {
            const b = books[i];
            let px = 0;
            let py = 0;
            if (booksCount === 1) {
              px = 0; py = 0;
            } else if (booksCount <= 4) {
              px = (i - (booksCount - 1) / 2) * stepX;
              const arcT = booksCount > 1 ? (i / (booksCount - 1)) * 2 - 1 : 0;
              py = -(1 - arcT * arcT) * 16 * cam.zoom;
            } else if (booksCount <= 8) {
              const r0 = Math.ceil(booksCount / 2);
              if (i < r0) {
                px = (i - (r0 - 1) / 2) * stepX;
                py = -stepY * 0.52;
              } else {
                const i1 = i - r0;
                const r1 = booksCount - r0;
                px = (i1 - (r1 - 1) / 2) * stepX + (stepX * 0.25);
                py = stepY * 0.52;
              }
            } else {
              const colsPerRow = Math.ceil(booksCount / 3);
              const row = Math.floor(i / colsPerRow);
              const colInRow = i % colsPerRow;
              const inRow = Math.min(colsPerRow, booksCount - row * colsPerRow);
              px = (colInRow - (inRow - 1) / 2) * stepX + ((row % 2) * stepX * 0.25);
              py = (row - 1) * stepY;
            }

            const bx = screenCenterX + px + cam.x;
            const by = screenCenterY + py + cam.y;
            const d = Math.hypot(bx - cam.lensX, by - cam.lensY);
            if (d < minApexDist) {
              minApexDist = d;
              hoverApexBook = b;
            }
          }
        }

        // 2. BUILD DRAW LIST FOR THE EXACT N BOOKS
        for (let i = 0; i < booksCount; i++) {
          const book = books[i];
          let px = 0;
          let py = 0;
          if (booksCount === 1) {
            px = 0; py = 0;
          } else if (booksCount <= 4) {
            px = (i - (booksCount - 1) / 2) * stepX;
            const arcT = booksCount > 1 ? (i / (booksCount - 1)) * 2 - 1 : 0;
            py = -(1 - arcT * arcT) * 16 * cam.zoom;
          } else if (booksCount <= 8) {
            const r0 = Math.ceil(booksCount / 2);
            if (i < r0) {
              px = (i - (r0 - 1) / 2) * stepX;
              py = -stepY * 0.52;
            } else {
              const i1 = i - r0;
              const r1 = booksCount - r0;
              px = (i1 - (r1 - 1) / 2) * stepX + (stepX * 0.25);
              py = stepY * 0.52;
            }
          } else {
            const colsPerRow = Math.ceil(booksCount / 3);
            const row = Math.floor(i / colsPerRow);
            const colInRow = i % colsPerRow;
            const inRow = Math.min(colsPerRow, booksCount - row * colsPerRow);
            px = (colInRow - (inRow - 1) / 2) * stepX + ((row % 2) * stepX * 0.25);
            py = (row - 1) * stepY;
          }

          const baseX = screenCenterX + px + cam.x;
          const baseY = screenCenterY + py + cam.y;

          // Bubble-up entrance calculation
          let bubbleScale = 1.0;
          let bubbleAlpha = 1.0;
          if (bubbleEntrance < 0.999) {
            const distFromCenter = Math.hypot(px, py);
            const delay = Math.min(0.5, (distFromCenter / 600) * 0.4);
            const localT = Math.min(1.0, Math.max(0, (bubbleEntrance - delay) / (1.0 - delay)));
            const pop = 1.0 + Math.sin(localT * Math.PI) * 0.22 * (1.0 - localT);
            bubbleScale = Math.max(0, localT * pop);
            bubbleAlpha = Math.min(1.0, localT * 1.6);
          }
          if (bubbleScale <= 0.02) continue;

          // Living Breathing Wave Heartbeat
          const breathFreq = animTime * 0.0022;
          const wave = Math.sin(px * 0.005 + breathFreq + i * 0.9) * Math.cos(py * 0.005 + breathFreq * 0.75 + i * 0.6);
          const breathY = wave * 7.5;
          const breathScale = 1.0 + wave * 0.04;

          const dxCursor = baseX - cam.lensX;
          const dyCursor = baseY - cam.lensY;
          const distToCursor = Math.hypot(dxCursor, dyCursor);

          const isSelectedHero = pullProgress > 0.01 && book.id === selectedBookRef.current?.id;
          const isHoverApex = !isDockOpen && book.id === hoverApexBook?.id && distToCursor < (cardW * 1.25);

          let elevation = 0;
          if (isSelectedHero) {
            elevation = 1.0 * pullProgress;
          } else if (isHoverApex) {
            elevation = 1.0;
          } else if (distToCursor < stepX * 2.4) {
            elevation = Math.pow(Math.max(0, 1.0 - distToCursor / (stepX * 2.4)), 2.0);
          }

          const scale = (1.0 + elevation * 0.28) * breathScale * bubbleScale;
          const w = cardW * scale;
          const h = cardH * scale;

          let screenX = baseX;
          let screenY = baseY + breathY - elevation * (24 * cam.zoom);

          // Subtle drag of neighboring books toward the apex
          let slopeAngle = 0;
          if (!isHoverApex && !isSelectedHero && elevation > 0.02 && distToCursor > 2) {
            const dragPull = elevation * (stepX * 0.16);
            screenX -= (dxCursor / distToCursor) * dragPull;
            screenY -= (dyCursor / distToCursor) * dragPull;
            slopeAngle = Math.atan2(dyCursor, dxCursor);
          }

          const opacity = (0.9 + elevation * 0.1) * bubbleAlpha;

          if (isHoverApex || isSelectedHero) {
            hoverApexCoords = { screenX, screenY, w, h };
          }

          drawList.push({
            book,
            screenX,
            screenY,
            w,
            h,
            elevation,
            isSelectedHero,
            isHoverApex,
            slopeAngle,
            opacity,
          });
        }
      } else {
        // =========================================================================
        // GLOBAL INFINITE OCEAN MODE
        // =========================================================================
        const cols = 20;
        const rows = Math.ceil(booksCount / cols);
        const cardW = 74 * cam.zoom;
        const cardH = 108 * cam.zoom;
        const stepX = 77 * cam.zoom;
        const stepY = 111 * cam.zoom;
        const gridW = cols * stepX;
        const gridH = rows * stepY;
        const mountainRadius = stepX * 3.4;

        const selectedIndex = selectedBookRef.current
          ? books.findIndex((b) => b.id === selectedBookRef.current?.id)
          : -1;
        const selCol = selectedIndex >= 0 ? selectedIndex % cols : -1;
        const selRow = selectedIndex >= 0 ? Math.floor(selectedIndex / cols) : -1;
        const selOffsetX = selRow >= 0 ? (selRow % 2) * (stepX * 0.5) : 0;
        const selBaseX = screenCenterX + selCol * stepX + selOffsetX + cam.x;
        const selBaseY = screenCenterY + selRow * stepY + cam.y;

        const bufferPadding = Math.max(width, height) * 0.6;
        const minCol = Math.floor((-cam.x - screenCenterX - bufferPadding) / stepX) - 3;
        const maxCol = Math.ceil((width - cam.x - screenCenterX + bufferPadding) / stepX) + 3;
        const minRow = Math.floor((-cam.y - screenCenterY - bufferPadding) / stepY) - 3;
        const maxRow = Math.ceil((height - cam.y - screenCenterY + bufferPadding) / stepY) + 3;

        if (!isDockOpen && cam.hasActiveMouse) {
          for (let r = minRow; r <= maxRow; r++) {
            const rowWrapped = ((r % rows) + rows) % rows;
            const offsetX = (r % 2) * (stepX * 0.5);
            for (let c = minCol; c <= maxCol; c++) {
              const colWrapped = ((c % cols) + cols) % cols;
              const bIndex = rowWrapped * cols + colWrapped;
              const b = books[bIndex % booksCount];
              if (!b) continue;

              const bx = screenCenterX + c * stepX + offsetX + cam.x;
              const by = screenCenterY + r * stepY + cam.y;
              const d = Math.hypot(bx - cam.lensX, by - cam.lensY);
              if (d < minApexDist) {
                minApexDist = d;
                hoverApexBook = b;
              }
            }
          }
        }

        for (let r = minRow; r <= maxRow; r++) {
          const rowWrapped = ((r % rows) + rows) % rows;
          const offsetX = (r % 2) * (stepX * 0.5);

          for (let c = minCol; c <= maxCol; c++) {
            const colWrapped = ((c % cols) + cols) % cols;
            const bookIndex = rowWrapped * cols + colWrapped;
            const book = books[bookIndex % booksCount];
            if (!book) continue;

            const baseX = screenCenterX + c * stepX + offsetX + cam.x;
            const baseY = screenCenterY + r * stepY + cam.y;

            let bubbleScale = 1.0;
            let bubbleAlpha = 1.0;
            if (bubbleEntrance < 0.999) {
              const distFromCenter = Math.hypot(baseX - screenCenterX, baseY - screenCenterY);
              const maxSpread = Math.max(width, height) * 0.8;
              const bookDelay = Math.min(0.55, (distFromCenter / maxSpread) * 0.48);
              const localT = Math.min(1.0, Math.max(0, (bubbleEntrance - bookDelay) / (1.0 - bookDelay)));
              const pop = 1.0 + Math.sin(localT * Math.PI) * 0.22 * (1.0 - localT);
              bubbleScale = Math.max(0, localT * pop);
              bubbleAlpha = Math.min(1.0, localT * 1.6);
            }
            if (bubbleScale <= 0.02) continue;

            const breathFreq = animTime * 0.0016;
            const wave1 = Math.sin(baseX * 0.0032 + breathFreq) * Math.cos(baseY * 0.0032 + breathFreq * 0.85);
            const wave2 = Math.sin((baseX * 0.75 - baseY * 0.75) * 0.0045 + breathFreq * 1.25) * 0.5;
            const oceanBreathing = (wave1 + wave2) * 0.75;

            let dSelX = 99999;
            let dSelY = 99999;
            let distToSelected = 99999;
            if (selectedIndex >= 0 && pullProgress > 0.01) {
              dSelX = baseX - selBaseX;
              dSelY = baseY - selBaseY;
              dSelX = dSelX - Math.round(dSelX / gridW) * gridW;
              dSelY = dSelY - Math.round(dSelY / gridH) * gridH;
              distToSelected = Math.hypot(dSelX, dSelY);
            }

            const dxCursor = baseX - cam.lensX;
            const dyCursor = baseY - cam.lensY;
            const distToCursor = Math.hypot(dxCursor, dyCursor);

            const isSelectedHero = pullProgress > 0.01 && book.id === selectedBookRef.current?.id;
            const isHoverApex = !isDockOpen && book.id === hoverApexBook?.id && distToCursor < stepX * 1.3;

            let hoverSlope = 0;
            if (!isDockOpen && cam.hasActiveMouse && distToCursor < mountainRadius) {
              const normCursor = distToCursor / mountainRadius;
              hoverSlope = Math.pow(Math.max(0, 1.0 - normCursor), 2.2);
              if (isHoverApex) hoverSlope = 1.0;
            }

            let selSlope = 0;
            if (selectedIndex >= 0 && pullProgress > 0.01 && distToSelected < mountainRadius) {
              const normSel = distToSelected / mountainRadius;
              selSlope = Math.pow(Math.max(0, 1.0 - normSel), 2.0) * pullProgress;
              if (isSelectedHero) selSlope = 1.0 * pullProgress;
            }

            const elevation = Math.min(1.0, Math.max(hoverSlope, selSlope));
            const swayWeight = Math.max(0, 1.0 - elevation * 1.5);
            let screenX = baseX + oceanBreathing * 5.5 * swayWeight;
            let screenY = baseY + oceanBreathing * 4.2 * swayWeight;

            let slopeAngle = 0;
            if (!isSelectedHero && !isHoverApex && elevation > 0.02) {
              if (hoverSlope >= selSlope && distToCursor > 2 && distToCursor < mountainRadius) {
                const dragPull = hoverSlope * (stepX * 0.22);
                screenX -= (dxCursor / distToCursor) * dragPull;
                screenY -= (dyCursor / distToCursor) * dragPull;
                slopeAngle = Math.atan2(dyCursor, dxCursor);
              } else if (selSlope > 0 && distToSelected > 2 && distToSelected < mountainRadius) {
                const dragPull = selSlope * (stepX * 0.22);
                screenX -= (dSelX / distToSelected) * dragPull;
                screenY -= (dSelY / distToSelected) * dragPull;
                slopeAngle = Math.atan2(dSelY, dSelX);
              }
            }

            const breathScale = 1.0 + oceanBreathing * 0.065 * swayWeight;
            const mountainScale = 1.0 + elevation * 0.95;
            const scale = mountainScale * breathScale * bubbleScale;

            const w = cardW * scale;
            const h = cardH * scale;
            let opacity = (0.86 + elevation * 0.14 + oceanBreathing * 0.06 * swayWeight) * bubbleAlpha;

            if (
              screenX + w < -120 ||
              screenX - w > width + 120 ||
              screenY + h < -120 ||
              screenY - h > height + 120
            ) {
              continue;
            }

            if (isHoverApex || isSelectedHero) {
              hoverApexCoords = { screenX, screenY, w, h };
            }

            drawList.push({
              book,
              screenX,
              screenY,
              w,
              h,
              elevation,
              isSelectedHero,
              isHoverApex,
              slopeAngle,
              opacity,
            });
          }
        }
      }

      // CRUCIAL FOR MOUNTAIN STACKING:
      // Sort strictly by elevation (Painter's Algorithm)
      // Lower elevation tiles are drawn underneath -> higher mountain tiers are drawn on top ->
      // The standout apex summit book is drawn LAST on top of all!
      drawList.sort((a, b) => a.elevation - b.elevation);

      const activeApexBook = isDockOpen ? selectedBookRef.current : hoverApexBook;

      // Render Mountain Stack of Books with Tiered Overlaps and 3D Cast Shadows
      for (let i = 0; i < drawList.length; i++) {
        const item = drawList[i];
        const {
          book,
          screenX,
          screenY,
          w,
          h,
          elevation,
          isSelectedHero,
          isHoverApex,
          slopeAngle,
          opacity,
        } = item;

        const isApexPeak = isSelectedHero || isHoverApex;
        const isHovered = !isDockOpen && activeApexBook?.id === book.id;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(screenX, screenY);

        // Subtle 3D slope tilt towards the mountain apex
        if (elevation > 0.04 && !isApexPeak) {
          ctx.rotate(slopeAngle * 0.07 * elevation);
        }

        const halfW = w / 2;
        const halfH = h / 2;
        const cornerRadius = Math.min(halfW, halfH) * 0.32;

        // TIERED STACK DROP SHADOWS:
        // Every book in the mountain stack casts a clean, crisp drop-shadow down onto the book underneath it!
        if (isApexPeak) {
          // Apex summit casts a deep, majestic 3D shadow across all the tiers below
          ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
          ctx.shadowBlur = 48;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 24;
        } else if (elevation > 0.04) {
          // Stepped stack shadows creating the distinct "stacked on top of each other" feel
          ctx.shadowColor = 'rgba(0, 0, 0, 0.84)';
          ctx.shadowBlur = Math.min(40, 6 + 30 * elevation);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 3 + 16 * elevation;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // Clip to organic rounded pebble contour
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfH, w, h, cornerRadius);
        ctx.clip();

        // 1. Draw book cover or bespoke embossed jacket
        const src = book.cover || book.cover_url;
        const img = imagesRef.current.get(src);
        const hasImg = img && img.complete && img.naturalWidth > 10;

        if (hasImg) {
          ctx.drawImage(img, -halfW, -halfH, w, h);
        } else {
          // Bespoke embossed book jacket directly on canvas
          const grad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
          grad.addColorStop(0, '#222222');
          grad.addColorStop(0.5, '#141414');
          grad.addColorStop(1, '#0a0a0a');
          ctx.fillStyle = grad;
          ctx.fillRect(-halfW, -halfH, w, h);

          // Subtle spine crease on left
          const spineW = Math.max(6, 12 * (w / 100));
          const spineGrad = ctx.createLinearGradient(-halfW, 0, -halfW + spineW, 0);
          spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
          spineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
          ctx.fillStyle = spineGrad;
          ctx.fillRect(-halfW, -halfH, spineW, h);

          // Decorative border
          ctx.strokeStyle = elevation > 0.4 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-halfW + 6, -halfH + 6, w - 12, h - 12);

          // Country Flag and Year Badge at top
          if (w > 50) {
            ctx.font = `500 ${Math.max(9, Math.floor(10 * (w / 120)))}px Inter, sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.textAlign = 'center';
            const flag = (book as any).countryFlag || '📖';
            const yearStr = book.year ? `${book.year}` : '';
            ctx.fillText(`${flag}  ${yearStr}`, 0, -halfH + 16);

            // Book Title
            ctx.font = `700 ${Math.max(10, Math.floor(12 * (w / 120)))}px Inter, sans-serif`;
            ctx.fillStyle = '#ffffff';

            const words = book.title.split(' ');
            let line = '';
            let lineY = -halfH + 38;
            const maxTitleW = w - 20;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxTitleW && n > 0) {
                ctx.fillText(line.trim(), 0, lineY);
                line = words[n] + ' ';
                lineY += 14 * (w / 120);
                if (lineY > -halfH + 95) {
                  line = '...';
                  break;
                }
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line.trim(), 0, lineY);

            // Author
            ctx.font = `500 ${Math.max(8, Math.floor(10 * (w / 120)))}px Inter, sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.fillText(book.author, 0, lineY + 18);

            // Rating badge at bottom
            if (book.rating) {
              ctx.font = `700 ${Math.max(8, Math.floor(9.5 * (w / 120)))}px monospace`;
              ctx.fillStyle = '#ffffff';
              ctx.fillText(`★ ${book.rating}%`, 0, halfH - 18);
            }
            ctx.textAlign = 'left';
          }
        }

        // 2. Mountain Facet Shading & Sunlight:
        const mountainSunlight = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        if (isApexPeak) {
          mountainSunlight.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
          mountainSunlight.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
          mountainSunlight.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
          mountainSunlight.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        } else if (elevation > 0.05) {
          mountainSunlight.addColorStop(0, `rgba(255, 255, 255, ${0.12 + elevation * 0.15})`);
          mountainSunlight.addColorStop(0.4, 'rgba(255, 255, 255, 0.04)');
          mountainSunlight.addColorStop(0.75, 'rgba(0, 0, 0, 0.1)');
          mountainSunlight.addColorStop(1, `rgba(0, 0, 0, ${0.3 + elevation * 0.2})`);
        } else {
          mountainSunlight.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
          mountainSunlight.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
          mountainSunlight.addColorStop(0.75, 'rgba(0, 0, 0, 0.15)');
          mountainSunlight.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        }
        ctx.fillStyle = mountainSunlight;
        ctx.fillRect(-halfW, -halfH, w, h);

        ctx.restore();

        // 3. MOUNTAIN STACK BORDERS & CREST HALOS (Monochrome):
        if (isApexPeak) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.8;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.roundRect(-halfW - 1.5, -halfH - 1.5, w + 3, h + 3, cornerRadius + 1.5);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(-halfW - 3, -halfH - 3, w + 6, h + 6, cornerRadius + 3);
          ctx.stroke();
          ctx.restore();
        } else if (elevation > 0.12) {
          ctx.save();
          ctx.translate(screenX, screenY);
          if (elevation > 0.04 && !isApexPeak) {
            ctx.rotate(slopeAngle * 0.07 * elevation);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + elevation * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = Math.min(12, 4 + 8 * elevation);
          ctx.beginPath();
          ctx.roundRect(-halfW - 0.5, -halfH - 0.5, w + 1, h + 1, cornerRadius + 0.5);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Update Floating Near-Book Preview Tag (tracks the active apex book)
      const floatingEl = floatingPreviewElRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (floatingEl) {
        if (isDockOpen || !activeApexBook || selectedBookRef.current) {
          floatingEl.style.opacity = '0';
          floatingEl.style.display = 'none';
        } else {
          let targetX = -9999;
          let targetY = -9999;
          let targetOpacity = 0;

          if (cam.hasActiveMouse && activeApexBook && !cam.isDragging && hoverApexCoords.w > 0) {
            const cardCenterX = hoverApexCoords.screenX / dpr;
            const cardCenterY = hoverApexCoords.screenY / dpr;
            const cardHalfW = hoverApexCoords.w / (2 * dpr);
            const cardHalfH = hoverApexCoords.h / (2 * dpr);

            const containerW = width / dpr;
            const containerH = height / dpr;

            const previewW = 270;
            const previewH = 95;

            let posX = cardCenterX + cardHalfW + 18;
            if (posX + previewW > containerW - 14) {
              posX = cardCenterX - cardHalfW - previewW - 18;
            }
            posX = Math.max(14, Math.min(containerW - previewW - 14, posX));

            let posY = cardCenterY - previewH * 0.45;
            posY = Math.max(14, Math.min(containerH - previewH - 14, posY));

            targetX = posX;
            targetY = posY;
            targetOpacity = 1;
          }

          const pos = floatingPosRef.current;
          if (pos.x < -5000 && targetX > 0) {
            pos.x = targetX;
            pos.y = targetY;
          } else if (targetX > 0) {
            pos.x += (targetX - pos.x) * 0.25;
            pos.y += (targetY - pos.y) * 0.25;
          }
          pos.opacity += (targetOpacity - pos.opacity) * 0.22;

          if (pos.opacity > 0.02) {
            floatingEl.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
            floatingEl.style.opacity = pos.opacity.toFixed(3);
            floatingEl.style.display = 'block';
          } else {
            floatingEl.style.opacity = '0';
            floatingEl.style.display = 'none';
          }
        }
      }

      // Throttled store update for focused book (only when dock is closed)
      if (!isDockOpen && time - lastHoverCheckTime > 50) {
        lastHoverCheckTime = time;
        if (cam.hasActiveMouse && !cam.isDragging) {
          if (activeApexBook) {
            if (activeApexBook.id !== currentPreviewIdRef.current) {
              currentPreviewIdRef.current = activeApexBook.id;
              setPreviewBook(activeApexBook);
              useBookStore.getState().setFocusedBook(activeApexBook);
            }
          } else if (currentPreviewIdRef.current !== null) {
            currentPreviewIdRef.current = null;
            setPreviewBook(null);
            useBookStore.getState().setFocusedBook(null);
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isDockOpen]);

  // Global window pointermove with mouse-guided navigation & motion intensity
  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const cam = cameraRef.current;
      cam.hasActiveMouse = true;
      cam.targetMouseX = (e.clientX - rect.left) * dpr;
      cam.targetMouseY = (e.clientY - rect.top) * dpr;

      const now = performance.now();
      if (cam.lastClientX !== 0 || cam.lastClientY !== 0) {
        const dt = Math.max(1, now - cam.lastPointerMoveTime);
        const distMoved = Math.hypot(e.clientX - cam.lastClientX, e.clientY - cam.lastClientY);
        cam.motionIntensity = Math.max(0.6, Math.min(2.2, 0.5 + distMoved / (dt * 0.75)));
      }
      cam.lastPointerMoveTime = now;
      cam.lastClientX = e.clientX;
      cam.lastClientY = e.clientY;

      // 1:1 Direct Pan while Dragging
      if (cam.isDragging && !isDockOpen) {
        const dx = (e.clientX - cam.lastDragX) * dpr;
        const dy = (e.clientY - cam.lastDragY) * dpr;
        const dt = Math.max(1, now - cam.lastDragTime);

        cam.x += dx;
        cam.y += dy;

        cam.vx = (dx / dt) * 12;
        cam.vy = (dy / dt) * 12;

        cam.lastDragX = e.clientX;
        cam.lastDragY = e.clientY;
        cam.lastDragTime = now;
      }
    };

    const onWindowPointerUp = () => {
      cameraRef.current.isDragging = false;
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
    };
  }, [isDockOpen]);

  // Wheel Zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (isDockOpen) return;
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomDelta = e.deltaY * -0.0012;
      cam.targetZoom = Math.max(0.42, Math.min(2.5, cam.targetZoom + zoomDelta));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [isDockOpen]);

  // Pointer Down on container starts drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDockOpen) return;
    const cam = cameraRef.current;
    cam.isDragging = true;
    cam.dragStartX = e.clientX;
    cam.dragStartY = e.clientY;
    cam.lastDragX = e.clientX;
    cam.lastDragY = e.clientY;
    cam.lastDragTime = performance.now();
    cam.vx = 0;
    cam.vy = 0;
    cam.targetVx = 0;
    cam.targetVy = 0;
  };

  const handleClick = (e: React.MouseEvent) => {
    const cam = cameraRef.current;
    const dragDist = Math.hypot(e.clientX - cam.dragStartX, e.clientY - cam.dragStartY);
    if (dragDist < 6) {
      // If dock is already open, clicking on the canvas outside the dock closes it and resumes animation
      if (isDockOpen) {
        onCloseDock?.();
        return;
      }

      // If dock is closed, clicking a book selects it and opens the dock
      const current = focusedBookRef.current || previewBook;
      if (current) {
        useBookStore.getState().setSelectedBook(current);
        onSelectBook?.(current);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden select-none bg-[#020712] ${
        isDockOpen ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Ethereal Preview Tag on Hover (Only when dock is closed) */}
      <div
        ref={floatingPreviewElRef}
        style={{ display: 'none', opacity: 0 }}
        className="pointer-events-none absolute top-0 left-0 z-20 w-72 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-sky-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.85)] text-zinc-100"
      >
        {previewBook && !isDockOpen && (
          <div className="flex items-start justify-between gap-3 select-none">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-sky-300/80 truncate flex items-center gap-1.5 mb-0.5">
                <span className="truncate">{previewBook.author}</span>
                {previewBook.year > 0 && (
                  <>
                    <span className="text-sky-600">•</span>
                    <span className="text-sky-400 font-mono text-[10px]">
                      {previewBook.year}
                    </span>
                  </>
                )}
              </p>

              <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                {previewBook.title}
              </h3>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/90 text-sky-200 border border-sky-700/40 truncate max-w-[120px]">
                  {previewBook.genre}
                </span>
                <span className="text-[10px] text-sky-400 font-mono font-medium">
                  Click to inspect ↗
                </span>
              </div>
            </div>

            {/* Circular Rating Dial */}
            <div
              className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-sky-800/60"
              title={`${previewBook.rating || 85}% Rating`}
            >
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                  <circle
                    cx="14"
                    cy="14"
                    r={10}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r={10}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-sky-400"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 10}
                    strokeDashoffset={
                      2 * Math.PI * 10 -
                      ((previewBook.rating || 85) / 100) * (2 * Math.PI * 10)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[8.5px] font-mono font-bold text-sky-100">
                  {previewBook.rating || 85}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Discreet Minimal Floating Back to Globe Pill */}
        {onBackToGlobe && activeCountry && (
          <div className="absolute top-5 left-5 z-30 pointer-events-auto">
            <button
              onClick={onBackToGlobe}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/85 hover:bg-zinc-900 backdrop-blur-xl border border-white/20 text-white text-xs font-medium transition-all shadow-2xl hover:border-white/40 active:scale-95"
              title="Return to Earth Globe (Esc)"
            >
              <span className="text-sm">{activeCountry.flag}</span>
              <span className="font-semibold tracking-wide">{activeCountry.name}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">Globe</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                Esc
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
