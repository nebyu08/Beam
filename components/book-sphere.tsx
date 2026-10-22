'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';

interface BookSphereProps {
  onSelectBook?: (book: Book) => void;
  isDockOpen?: boolean;
  onCloseDock?: () => void;
}

export default function BookSphere({ onSelectBook, isDockOpen = false, onCloseDock }: BookSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const currentPreviewIdRef = useRef<number | null>(null);
  const floatingPreviewElRef = useRef<HTMLDivElement | null>(null);
  const floatingPosRef = useRef({ x: -9999, y: -9999, opacity: 0 });

  const filteredBooks = useBookStore((s) => s.filteredBooks);
  const booksRef = useRef<Book[]>(filteredBooks);
  booksRef.current = filteredBooks;

  const focusedBook = useBookStore((s) => s.focusedBook);
  const focusedBookRef = useRef<Book | null>(focusedBook);
  focusedBookRef.current = focusedBook;

  const selectedBook = useBookStore((s) => s.selectedBook);
  const selectedBookRef = useRef<Book | null>(selectedBook);
  selectedBookRef.current = selectedBook;

  // Elevation pull progress for the selected book (0 = in ocean, 1 = pulled up towards viewer)
  const pullProgressRef = useRef(0);

  // Simulation time ref: only advances when dock is closed so ocean freezes while inspecting book
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
    isPointerResting: true,
    width: 0,
    height: 0,
  });

  // Cached image elements
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Preload covers
  useEffect(() => {
    if (!filteredBooks || filteredBooks.length === 0) return;

    filteredBooks.forEach((book) => {
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
  }, [filteredBooks]);

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

  // Main 60FPS Endless Ocean Top-View Render Loop
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

      // When the dock is open, pause the ocean simulation time so the scene freezes peacefully
      if (!isDockOpen) {
        simTimeRef.current += dt;
      }
      const animTime = simTimeRef.current;

      const cam = cameraRef.current;
      const width = canvas.width || 800;
      const height = canvas.height || 600;

      const screenCenterX = width / 2;
      const screenCenterY = height / 2;

      // Animate Elevation Pull Progress for the Selected Hero Book
      // 1.0 when selected, 0.0 when cleared
      const targetPull = selectedBookRef.current ? 1.0 : 0.0;
      pullProgressRef.current += (targetPull - pullProgressRef.current) * 0.075;
      const pullProgress = pullProgressRef.current;

      // Pointer resting detection: if pointer hasn't moved in > 100ms, it is at rest!
      const timeSinceLastMove = time - cam.lastPointerMoveTime;
      if (timeSinceLastMove > 100) {
        cam.isPointerResting = true;
      }

      // Smooth mouse tracking
      if (cam.hasActiveMouse) {
        cam.mouseX += (cam.targetMouseX - cam.mouseX) * 0.18;
        cam.mouseY += (cam.targetMouseY - cam.mouseY) * 0.18;
        cam.lensX += (cam.mouseX - cam.lensX) * 0.22;
        cam.lensY += (cam.mouseY - cam.lensY) * 0.22;
      }

      // If dock is open, stop camera motion completely
      if (isDockOpen || cam.isPointerResting || cam.isDragging || !cam.hasActiveMouse) {
        cam.targetVx = 0;
        cam.targetVy = 0;
        cam.vx *= 0.82;
        cam.vy *= 0.82;
        if (Math.hypot(cam.vx, cam.vy) < 0.015) {
          cam.vx = 0;
          cam.vy = 0;
        }
      }

      // If manual dragging, cancel auto-swoop
      if (cam.isDragging) {
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
        cam.vx += (cam.targetVx - cam.vx) * 0.09;
        cam.vy += (cam.targetVy - cam.vy) * 0.09;

        cam.x += cam.vx * (dt / 16);
        cam.y += cam.vy * (dt / 16);

        if (Math.abs(cam.targetVx) < 0.01 && Math.abs(cam.vx) < 0.02) cam.vx = 0;
        if (Math.abs(cam.targetVy) < 0.01 && Math.abs(cam.vy) < 0.02) cam.vy = 0;
      }

      // Smooth zoom interpolation
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.055;

      // Abyssal Ocean Top-View Background
      ctx.fillStyle = '#020712';
      ctx.fillRect(0, 0, width, height);

      // Deep Ocean Bioluminescent Ambient Glow
      const oceanAmbient = ctx.createRadialGradient(
        cam.lensX,
        cam.lensY,
        50,
        cam.lensX,
        cam.lensY,
        Math.max(width, height) * 0.88
      );
      oceanAmbient.addColorStop(0, '#0c273e');
      oceanAmbient.addColorStop(0.4, '#051829');
      oceanAmbient.addColorStop(0.75, '#030d17');
      oceanAmbient.addColorStop(1, '#01050a');
      ctx.fillStyle = oceanAmbient;
      ctx.fillRect(0, 0, width, height);

      const books = booksRef.current;
      const booksCount = books.length;

      if (booksCount === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // Top-view book pebble dimensions
      const cols = 20;
      const rows = Math.ceil(booksCount / cols);

      const cardW = 74 * cam.zoom;
      const cardH = 108 * cam.zoom;

      // Tight ocean stone lattice spacing
      const stepX = 77 * cam.zoom;
      const stepY = 111 * cam.zoom;

      // Total wrapped grid dimensions for toroidal distance calculations
      const gridW = cols * stepX;
      const gridH = rows * stepY;

      // Lens radius for gentle cursor ripple
      const lensRadius = Math.max(width, height) * 0.55 * Math.sqrt(cam.zoom);

      // Selected book coordinates on the plane
      const selectedIndex = selectedBookRef.current
        ? books.findIndex((b) => b.id === selectedBookRef.current?.id)
        : -1;
      const selCol = selectedIndex >= 0 ? selectedIndex % cols : -1;
      const selRow = selectedIndex >= 0 ? Math.floor(selectedIndex / cols) : -1;
      const selOffsetX = selRow >= 0 ? (selRow % 2) * (stepX * 0.5) : 0;
      const selBaseX = screenCenterX + selCol * stepX + selOffsetX + cam.x;
      const selBaseY = screenCenterY + selRow * stepY + cam.y;

      // Radius within which neighboring books are stacked to support the pulled book
      const stackRadius = stepX * 2.85;

      let closestBook: Book | null = isDockOpen ? selectedBookRef.current : null;
      let closestCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };
      let directHitBook: Book | null = null;
      let directHitCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };
      let highestDirectElevation = -1;
      let minDistanceToLens = Infinity;
      let lensBook: Book | null = null;
      let lensCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };

      interface OceanBookItem {
        book: Book;
        screenX: number;
        screenY: number;
        w: number;
        h: number;
        elevation: number;
        isSelectedHero: boolean;
        totalBulge: number;
        opacity: number;
      }

      const drawList: OceanBookItem[] = [];

      // Endless ocean grid buffer
      const bufferPadding = Math.max(width, height) * 0.6;
      const minCol = Math.floor((-cam.x - screenCenterX - bufferPadding) / stepX) - 3;
      const maxCol = Math.ceil((width - cam.x - screenCenterX + bufferPadding) / stepX) + 3;
      const minRow = Math.floor((-cam.y - screenCenterY - bufferPadding) / stepY) - 3;
      const maxRow = Math.ceil((height - cam.y - screenCenterY + bufferPadding) / stepY) + 3;

      for (let r = minRow; r <= maxRow; r++) {
        const rowWrapped = ((r % rows) + rows) % rows;
        const offsetX = (r % 2) * (stepX * 0.5);

        for (let c = minCol; c <= maxCol; c++) {
          const colWrapped = ((c % cols) + cols) % cols;
          const bookIndex = rowWrapped * cols + colWrapped;
          const book = books[bookIndex % booksCount];
          if (!book) continue;

          // Undistorted grid coordinate
          const baseX = screenCenterX + c * stepX + offsetX + cam.x;
          const baseY = screenCenterY + r * stepY + cam.y;

          // 1. Organic Ocean Swell Wave (uses animTime which freezes when dock is open)
          const swell1 =
            Math.sin(baseX * 0.0032 + animTime * 0.0012) * Math.cos(baseY * 0.0032 + animTime * 0.001);
          const swell2 = Math.sin((baseX + baseY) * 0.0048 + animTime * 0.0016) * 0.45;
          const oceanSwell = (swell1 + swell2) * 0.7; // -1.0 to +1.0

          // 2. Toroidal Distance to Selected Book
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

          // 3. Elevation & 3D Stacking Calculation
          let elevation = 0;
          let isSelectedHero = false;

          if (pullProgress > 0.01 && book.id === selectedBookRef.current?.id) {
            isSelectedHero = true;
            elevation = 1.0 * pullProgress;
          } else if (pullProgress > 0.01 && distToSelected < stackRadius) {
            const norm = distToSelected / stackRadius;
            const stepped = Math.pow(Math.max(0, 1.0 - norm), 1.55);
            elevation = stepped * 0.65 * pullProgress;
          }

          // Base position with ocean wave swell
          const waveWeight = Math.max(0, 1.0 - elevation * 1.5);
          let screenX = baseX + oceanSwell * 3.6 * waveWeight;
          let screenY = baseY + oceanSwell * 2.8 * waveWeight;

          // 4. Stacking Displacement: Neighbors pull inward toward hero book
          if (!isSelectedHero && elevation > 0.02 && distToSelected > 1) {
            const pullTowardsHero =
              (1.0 - distToSelected / stackRadius) * (stepX * 0.22) * pullProgress;
            screenX -= (dSelX / distToSelected) * pullTowardsHero;
            screenY -= (dSelY / distToSelected) * pullTowardsHero;
          }

          // 5. Cursor Hover Hydrodynamic Ripple (active only when dock is closed)
          let totalBulge = 0;
          let scale = 1.0;
          let opacity = 0.92;

          if (cam.hasActiveMouse && !isDockOpen) {
            const dx = screenX - cam.lensX;
            const dy = screenY - cam.lensY;
            const distToMouse = Math.hypot(dx, dy);

            if (distToMouse < lensRadius) {
              const normDist = distToMouse / lensRadius;
              const bulge = Math.pow(Math.max(0, 1.0 - normDist), 1.8);
              const ripple =
                Math.sin(normDist * 16.0 - animTime * 0.0032) * 0.05 * (1.0 - normDist);
              totalBulge = Math.max(0, bulge + ripple);

              if (elevation < 0.2 && distToMouse > 0.01) {
                const push = totalBulge * (cardW * 0.35);
                screenX += (dx / distToMouse) * push;
                screenY += (dy / distToMouse) * push;
              }
            }
          }

          // 6. Scale
          if (isSelectedHero) {
            scale = 1.0 + 1.15 * elevation; // Ascends high towards viewer
            opacity = 1.0;
          } else if (elevation > 0) {
            scale = 1.0 + 0.42 * elevation; // Stepped up
            opacity = 0.95 + elevation * 0.05;
          } else {
            scale = 1.0 + totalBulge * 0.45;
            opacity = 0.88 + totalBulge * 0.12;
          }

          const w = cardW * scale;
          const h = cardH * scale;

          // Frustum culling
          if (
            screenX + w < -100 ||
            screenX - w > width + 100 ||
            screenY + h < -100 ||
            screenY - h > height + 100
          ) {
            continue;
          }

          // If dock is closed, calculate active pebble under cursor
          if (!isDockOpen && cam.hasActiveMouse && !cam.isDragging) {
            const isInside =
              Math.abs(screenX - cam.lensX) <= (w / 2) * 1.05 &&
              Math.abs(screenY - cam.lensY) <= (h / 2) * 1.05;

            const effectiveElev = elevation + totalBulge;
            if (isInside && effectiveElev > highestDirectElevation) {
              highestDirectElevation = effectiveElev;
              directHitBook = book;
              directHitCoords = { screenX, screenY, w, h };
            }

            const distToLens = Math.hypot(screenX - cam.lensX, screenY - cam.lensY);
            if (distToLens < minDistanceToLens && (totalBulge > 0.3 || elevation > 0.3)) {
              minDistanceToLens = distToLens;
              lensBook = book;
              lensCoords = { screenX, screenY, w, h };
            }
          }

          drawList.push({
            book,
            screenX,
            screenY,
            w,
            h,
            elevation,
            isSelectedHero,
            totalBulge,
            opacity,
          });
        }
      }

      // Sort strictly by elevation (Painter's Algorithm)
      drawList.sort((a, b) => a.elevation - b.elevation);

      if (!isDockOpen) {
        if (directHitBook) {
          closestBook = directHitBook;
          closestCoords = directHitCoords;
        } else if (lensBook) {
          closestBook = lensBook;
          closestCoords = lensCoords;
        }
      }

      // Render Endless Ocean Books with 3D Stacked Elevation Illusion
      for (let i = 0; i < drawList.length; i++) {
        const item = drawList[i];
        const { book, screenX, screenY, w, h, elevation, isSelectedHero, totalBulge, opacity } =
          item;

        const isFocused =
          focusedBookRef.current?.id === book.id || selectedBookRef.current?.id === book.id;
        const isHovered = !isDockOpen && closestBook?.id === book.id;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(screenX, screenY);

        const halfW = w / 2;
        const halfH = h / 2;
        const cornerRadius = Math.min(halfW, halfH) * 0.32;

        // 3D Drop Shadows
        if (isSelectedHero) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
          ctx.shadowBlur = 45 * elevation;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 24 * elevation;
        } else if (elevation > 0.05) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = 18 * elevation;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10 * elevation;
        } else if (isHovered) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 16;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 6;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // Clip to organic ocean pebble contour
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfH, w, h, cornerRadius);
        ctx.clip();

        // 1. Draw book cover
        const src = book.cover || book.cover_url;
        const img = imagesRef.current.get(src);

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -halfW, -halfH, w, h);
        } else {
          const hash = book.id * 47;
          const hue = hash % 360;
          ctx.fillStyle = `hsl(${hue}, 22%, 12%)`;
          ctx.fillRect(-halfW, -halfH, w, h);

          if (w > 38) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = `600 ${Math.max(8, Math.floor(w * 0.11))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(book.title.slice(0, 18), 0, 0);
          }
        }

        // 2. Oceanic Inner Vignette
        const innerVignette = ctx.createRadialGradient(
          0,
          0,
          halfW * 0.45,
          0,
          0,
          Math.max(halfW, halfH)
        );
        innerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        innerVignette.addColorStop(0.75, 'rgba(0, 0, 0, 0.25)');
        innerVignette.addColorStop(1, 'rgba(1, 8, 18, 0.75)');
        ctx.fillStyle = innerVignette;
        ctx.fillRect(-halfW, -halfH, w, h);

        // 3. Tactile 3D Ocean Sheen
        const waterSheen = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        if (isSelectedHero) {
          waterSheen.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
          waterSheen.addColorStop(0.35, 'rgba(125, 211, 252, 0.15)');
          waterSheen.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
          waterSheen.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        } else if (elevation > 0.05) {
          waterSheen.addColorStop(0, 'rgba(186, 230, 253, 0.2)');
          waterSheen.addColorStop(0.4, 'rgba(56, 189, 248, 0.06)');
          waterSheen.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
          waterSheen.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        } else {
          waterSheen.addColorStop(0, 'rgba(125, 211, 252, 0.12)');
          waterSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
          waterSheen.addColorStop(0.75, 'rgba(0, 0, 0, 0.15)');
          waterSheen.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        }
        ctx.fillStyle = waterSheen;
        ctx.fillRect(-halfW, -halfH, w, h);

        // 4. Ocean Depth Fog
        if (elevation < 0.1 && totalBulge < 0.2 && !isFocused && !isHovered) {
          const depthFog = (0.2 - totalBulge) * 2.2;
          ctx.fillStyle = `rgba(2, 9, 20, ${depthFog * 0.38})`;
          ctx.fillRect(-halfW, -halfH, w, h);
        }

        ctx.restore();

        // 5. Bioluminescent Aura & High-Contrast Halo
        if (isSelectedHero) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.98)';
          ctx.lineWidth = 3.0;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 28;
          ctx.beginPath();
          ctx.roundRect(-halfW - 1.5, -halfH - 1.5, w + 3, h + 3, cornerRadius + 1.5);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(-halfW - 3, -halfH - 3, w + 6, h + 6, cornerRadius + 3);
          ctx.stroke();

          ctx.restore();
        } else if (elevation > 0.05) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + elevation * 0.4})`;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(-halfW - 0.5, -halfH - 0.5, w + 1, h + 1, cornerRadius + 0.5);
          ctx.stroke();
          ctx.restore();
        } else if (!isDockOpen && (isFocused || isHovered)) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.roundRect(-halfW - 1, -halfH - 1, w + 2, h + 2, cornerRadius + 1);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Update Floating Near-Book Preview Tag (suppressed when dock is open)
      const floatingEl = floatingPreviewElRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (floatingEl) {
        if (isDockOpen || !closestBook || selectedBookRef.current) {
          floatingEl.style.opacity = '0';
          floatingEl.style.display = 'none';
        } else {
          let targetX = -9999;
          let targetY = -9999;
          let targetOpacity = 0;

          if (cam.hasActiveMouse && closestBook && !cam.isDragging) {
            const cardCenterX = closestCoords.screenX / dpr;
            const cardCenterY = closestCoords.screenY / dpr;
            const cardHalfW = closestCoords.w / (2 * dpr);
            const cardHalfH = closestCoords.h / (2 * dpr);

            const containerW = width / dpr;
            const containerH = height / dpr;

            const previewW = 270;
            const previewH = 95;

            let posX = cardCenterX + cardHalfW + 16;
            if (posX + previewW > containerW - 14) {
              posX = cardCenterX - cardHalfW - previewW - 16;
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

      // Throttled store update for focused book and preview (only when dock is closed)
      if (!isDockOpen && time - lastHoverCheckTime > 50) {
        lastHoverCheckTime = time;
        if (cam.hasActiveMouse && !cam.isDragging) {
          if (closestBook) {
            if (closestBook.id !== currentPreviewIdRef.current) {
              currentPreviewIdRef.current = closestBook.id;
              setPreviewBook(closestBook);
              useBookStore.getState().setFocusedBook(closestBook);
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

  // Global window pointermove with motion-resting detection
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

      // Reset resting state whenever pointer actively moves
      cam.lastPointerMoveTime = performance.now();
      cam.isPointerResting = false;

      // 1:1 Direct Pan while Dragging
      if (cam.isDragging && !isDockOpen) {
        const dx = (e.clientX - cam.lastDragX) * dpr;
        const dy = (e.clientY - cam.lastDragY) * dpr;
        const now = performance.now();
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
      </div>
    </div>
  );
}
