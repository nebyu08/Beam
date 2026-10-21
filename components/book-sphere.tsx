'use client';

import React, { useEffect, useRef } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';

interface BookSphereProps {
  onSelectBook?: (book: Book) => void;
}

export default function BookSphere({ onSelectBook }: BookSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredBooks = useBookStore((s) => s.filteredBooks);
  const booksRef = useRef<Book[]>(filteredBooks);
  booksRef.current = filteredBooks;

  const focusedBook = useBookStore((s) => s.focusedBook);
  const focusedBookRef = useRef<Book | null>(focusedBook);
  focusedBookRef.current = focusedBook;

  // Infinite Camera & Physics state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    lastDragTime: 0,
    mouseX: 0,
    mouseY: 0,
    lensX: 0,
    lensY: 0,
    hasInteracted: false,
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

  // Center camera when focusedBook changes externally (e.g. Surprise Me)
  const lastCenteringIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focusedBook) return;
    if (lastCenteringIdRef.current === focusedBook.id) return;
    lastCenteringIdRef.current = focusedBook.id;

    const books = booksRef.current;
    const index = books.findIndex((b) => b.id === focusedBook.id);
    if (index === -1) return;

    const cols = 16;
    const cellW = 72;
    const cellH = 108;
    const col = index % cols;
    const row = Math.floor(index / cols);

    const targetX = -(col * cellW + ((row % 2) * cellW * 0.5));
    const targetY = -(row * cellH);

    cameraRef.current.targetX = targetX;
    cameraRef.current.targetY = targetY;
  }, [focusedBook]);

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
      if (cameraRef.current.mouseX === 0 && cameraRef.current.mouseY === 0) {
        cameraRef.current.mouseX = (w * dpr) / 2;
        cameraRef.current.mouseY = (h * dpr) / 2;
        cameraRef.current.lensX = (w * dpr) / 2;
        cameraRef.current.lensY = (h * dpr) * 0.55;
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Main 60FPS Infinite Fisheye Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let lastHoverCheckTime = 0;

    const render = (time: number) => {
      const cam = cameraRef.current;
      const width = canvas.width || 800;
      const height = canvas.height || 600;

      // Smooth camera pan interpolation
      cam.x += (cam.targetX - cam.x) * 0.08;
      cam.y += (cam.targetY - cam.y) * 0.08;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

      // Physics inertia
      if (!cam.isDragging) {
        cam.targetX += cam.vx;
        cam.targetY += cam.vy;
        cam.vx *= 0.94;
        cam.vy *= 0.94;

        // Subtle ambient glide when idle
        if (Math.abs(cam.vx) < 0.01 && Math.abs(cam.vy) < 0.01 && !cam.hasInteracted) {
          cam.targetX -= 0.2;
        }
      }

      // Smooth lens focus tracking
      const targetLensX = width / 2 + (cam.mouseX - width / 2) * 0.25;
      const targetLensY = height * 0.54 + (cam.mouseY - height * 0.54) * 0.25;
      cam.lensX += (targetLensX - cam.lensX) * 0.12;
      cam.lensY += (targetLensY - cam.lensY) * 0.12;

      // Deep cosmic black background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric radial glow
      const bgGrad = ctx.createRadialGradient(
        cam.lensX,
        cam.lensY,
        50,
        cam.lensX,
        cam.lensY,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#161622');
      bgGrad.addColorStop(0.35, '#0b0b10');
      bgGrad.addColorStop(1, '#040405');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const books = booksRef.current;
      const booksCount = books.length;

      if (booksCount === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // Grid dimensions (dense infinite lattice)
      const cols = 16;
      const rows = Math.ceil(booksCount / cols);

      const cellW = 74 * cam.zoom;
      const cellH = 110 * cam.zoom;
      const baseW = 62 * cam.zoom;
      const baseH = 94 * cam.zoom;

      // Spherical fisheye lens properties
      const lensRadius = Math.min(width, height) * 0.42 * Math.sqrt(cam.zoom);
      const bulgeStrength = 1.35;

      let closestBook: Book | null = null;
      let minDistanceToCenter = Infinity;

      interface RenderableBook {
        book: Book;
        screenX: number;
        screenY: number;
        w: number;
        h: number;
        z: number;
        opacity: number;
      }

      const drawList: RenderableBook[] = [];

      // Calculate grid range to cover the FULL screen plus margins for the bulge
      const margin = lensRadius * 0.6;
      const minCol = Math.floor((-cam.x - cam.lensX - margin) / cellW) - 1;
      const maxCol = Math.ceil((width - cam.x - cam.lensX + margin) / cellW) + 1;
      const minRow = Math.floor((-cam.y - cam.lensY - margin) / cellH) - 1;
      const maxRow = Math.ceil((height - cam.y - cam.lensY + margin) / cellH) + 1;

      for (let r = minRow; r <= maxRow; r++) {
        const rowWrapped = ((r % rows) + rows) % rows;
        const offsetX = (r % 2) * (cellW * 0.5);

        for (let c = minCol; c <= maxCol; c++) {
          const colWrapped = ((c % cols) + cols) % cols;
          const bookIndex = rowWrapped * cols + colWrapped;
          const book = books[bookIndex % booksCount];
          if (!book) continue;

          // Undistorted screen position relative to lens
          const rawRelX = c * cellW + offsetX + cam.x;
          const rawRelY = r * cellH + cam.y;

          const dist = Math.hypot(rawRelX, rawRelY);

          let screenX: number;
          let screenY: number;
          let z = 0;
          let scale = 1.0;
          let opacity = 1.0;

          if (dist < lensRadius) {
            // Inside the spherical fisheye lens
            const normDist = dist / lensRadius; // 0 at center, 1 at boundary
            
            // Spherical height (1 at apex, 0 at rim)
            z = Math.sqrt(Math.max(0, 1.0 - normDist * normDist));

            // Radial outward push: pushes neighbors outward to make room for center book
            const pushFactor = 1.0 + 0.48 * Math.pow(1.0 - normDist, 1.8);
            const curvedDist = dist * pushFactor;
            const angle = Math.atan2(rawRelY, rawRelX);

            screenX = cam.lensX + Math.cos(angle) * curvedDist;
            screenY = cam.lensY + Math.sin(angle) * curvedDist;

            // Center books expand up to ~2.2x
            scale = 0.9 + Math.pow(z, 1.5) * 1.3;
            opacity = 0.6 + z * 0.4;
          } else {
            // Outside the lens: infinite flat perspective carpet of books
            screenX = cam.lensX + rawRelX;
            screenY = cam.lensY + rawRelY;
            z = 0;
            scale = 0.9;

            // Soft edge vignetting towards the far edges of screen
            const edgeDist = Math.hypot(screenX - width / 2, screenY - height / 2);
            const maxRadius = Math.max(width, height) * 0.72;
            const normEdge = Math.min(1, edgeDist / maxRadius);
            opacity = Math.max(0.12, 0.7 - Math.pow(normEdge, 2) * 0.6);
          }

          const w = baseW * scale;
          const h = baseH * scale;

          // Screen frustum culling
          if (
            screenX + w < -20 ||
            screenX - w > width + 20 ||
            screenY + h < -20 ||
            screenY - h > height + 20
          ) {
            continue;
          }

          // Check for closest book to center of lens
          const distToLens = Math.hypot(screenX - cam.lensX, screenY - cam.lensY);
          if (distToLens < minDistanceToCenter && z > 0.35) {
            minDistanceToCenter = distToLens;
            closestBook = book;
          }

          drawList.push({
            book,
            screenX,
            screenY,
            w,
            h,
            z,
            opacity,
          });
        }
      }

      // Sort by depth (farthest first, frontmost centered books last)
      drawList.sort((a, b) => a.z - b.z);

      // Render each book cover
      for (let i = 0; i < drawList.length; i++) {
        const item = drawList[i];
        const { book, screenX, screenY, w, h, z, opacity } = item;

        const isFocused = focusedBookRef.current?.id === book.id && z > 0.4;
        const isCenterHover = closestBook?.id === book.id;

        ctx.save();
        ctx.globalAlpha = opacity;

        const x = screenX - w / 2;
        const y = screenY - h / 2;
        const cornerRadius = Math.max(2, 6 * (w / baseW));

        // Depth drop shadow
        if (z > 0.25) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = Math.min(30, 22 * z);
          ctx.shadowOffsetY = 8 * z;
        }

        // Rounded cover border
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, cornerRadius);
        ctx.clip();

        // Draw image or book placeholder
        const src = book.cover || book.cover_url;
        const img = imagesRef.current.get(src);

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, x, y, w, h);
        } else {
          const hash = book.id * 47;
          const hue = hash % 360;
          ctx.fillStyle = `hsl(${hue}, 30%, 14%)`;
          ctx.fillRect(x, y, w, h);

          // Spine
          ctx.fillStyle = `hsl(${hue}, 40%, 22%)`;
          ctx.fillRect(x, y, Math.max(2, w * 0.12), h);

          if (w > 40) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = `600 ${Math.max(8, Math.floor(w * 0.11))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(book.title.slice(0, 16), x + w / 2, y + h / 2);
          }
        }

        // Curvature lighting (books further from apex receive subtle shading)
        if (z < 0.8) {
          const shade = (1.0 - z) * 0.45;
          ctx.fillStyle = `rgba(0, 0, 0, ${shade})`;
          ctx.fillRect(x, y, w, h);
        }

        ctx.restore();

        // Radiant halo on the active focused book
        if (isFocused || isCenterHover) {
          ctx.save();
          ctx.strokeStyle = isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = isFocused ? 2.5 : 1.5;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = isFocused ? 20 : 10;

          ctx.beginPath();
          ctx.roundRect(x - 2, y - 2, w + 4, h + 4, cornerRadius + 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Soft vignette on screen borders
      ctx.save();
      const screenVignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.45,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      screenVignette.addColorStop(0, 'rgba(6, 6, 8, 0)');
      screenVignette.addColorStop(0.7, 'rgba(6, 6, 8, 0.4)');
      screenVignette.addColorStop(1, 'rgba(6, 6, 8, 0.95)');
      ctx.fillStyle = screenVignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Throttled update of focused book in store
      if (time - lastHoverCheckTime > 75) {
        lastHoverCheckTime = time;
        if (closestBook && closestBook.id !== focusedBookRef.current?.id) {
          useBookStore.getState().setFocusedBook(closestBook);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Wheel Zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      cam.hasInteracted = true;
      const zoomDelta = e.deltaY * -0.0012;
      cam.targetZoom = Math.max(0.55, Math.min(2.5, cam.targetZoom + zoomDelta));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const cam = cameraRef.current;
    cam.isDragging = true;
    cam.hasInteracted = true;
    cam.lastMouseX = e.clientX;
    cam.lastMouseY = e.clientY;
    cam.lastDragTime = performance.now();
    cam.vx = 0;
    cam.vy = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const cam = cameraRef.current;
    cam.mouseX = (e.clientX - rect.left) * dpr;
    cam.mouseY = (e.clientY - rect.top) * dpr;

    if (cam.isDragging) {
      const dx = (e.clientX - cam.lastMouseX) * dpr;
      const dy = (e.clientY - cam.lastMouseY) * dpr;
      const now = performance.now();
      const dt = Math.max(1, now - cam.lastDragTime);

      cam.targetX += dx;
      cam.targetY += dy;

      cam.vx = (dx / dt) * 12;
      cam.vy = (dy / dt) * 12;

      cam.lastMouseX = e.clientX;
      cam.lastMouseY = e.clientY;
      cam.lastDragTime = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const cam = cameraRef.current;
    cam.isDragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleClick = () => {
    const current = focusedBookRef.current;
    if (current) {
      useBookStore.getState().setSelectedBook(current);
      onSelectBook?.(current);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#060608]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
