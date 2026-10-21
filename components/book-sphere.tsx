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

  const selectedBook = useBookStore((s) => s.selectedBook);

  // Infinite Camera & Physics state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetVx: 0,
    targetVy: 0,
    zoom: 0.65,
    targetZoom: 0.65,
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

  // Center camera on book ONLY when explicitly requested (Surprise Me or list modal)
  const lastCenteringIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedBook) return;
    if (lastCenteringIdRef.current === selectedBook.id) return;
    lastCenteringIdRef.current = selectedBook.id;

    const books = booksRef.current;
    const index = books.findIndex((b) => b.id === selectedBook.id);
    if (index === -1) return;

    const cols = 18;
    const stepX = 56;
    const stepY = 80;
    const col = index % cols;
    const row = Math.floor(index / cols);

    const targetX = -(col * stepX + ((row % 2) * stepX * 0.5));
    const targetY = -(row * stepY);

    cameraRef.current.x = targetX;
    cameraRef.current.y = targetY;
    cameraRef.current.vx = 0;
    cameraRef.current.vy = 0;
    cameraRef.current.targetVx = 0;
    cameraRef.current.targetVy = 0;
    cameraRef.current.targetZoom = 0.9;
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
        cameraRef.current.mouseY = (h * dpr) * 0.52;
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

  // Main 60FPS Endless Fluid Render Loop
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

      const cam = cameraRef.current;
      const width = canvas.width || 800;
      const height = canvas.height || 600;

      const screenCenterX = width / 2;
      const screenCenterY = height * 0.52;

      // Smooth mouse coordinates spring
      if (cam.hasActiveMouse) {
        cam.mouseX += (cam.targetMouseX - cam.mouseX) * 0.16;
        cam.mouseY += (cam.targetMouseY - cam.mouseY) * 0.16;
        cam.lensX += (cam.mouseX - cam.lensX) * 0.18;
        cam.lensY += (cam.mouseY - cam.lensY) * 0.18;

        // Fluid directional flight when cursor moves toward edges
        if (!cam.isDragging) {
          const normX = (cam.mouseX - screenCenterX) / (width * 0.42);
          const normY = (cam.mouseY - screenCenterY) / (height * 0.42);
          const distFromCenter = Math.hypot(normX, normY);

          // Calm center deadzone (inner 22% of screen) so you can inspect steadily
          if (distFromCenter > 0.22) {
            const edgeRamp = Math.min(1.0, (distFromCenter - 0.22) / 0.78);
            // Buttery smooth cubic flight curve
            const maxFlightSpeed = 14.0 * Math.max(0.6, cam.zoom);
            const currentSpeed = Math.pow(edgeRamp, 1.8) * maxFlightSpeed;

            cam.targetVx = -(normX / distFromCenter) * currentSpeed;
            cam.targetVy = -(normY / distFromCenter) * currentSpeed;
          } else {
            cam.targetVx = 0;
            cam.targetVy = 0;
          }
        }
      } else {
        cam.targetVx = 0;
        cam.targetVy = 0;
      }

      // Physics integration with fluid damping
      if (!cam.isDragging) {
        cam.vx += (cam.targetVx - cam.vx) * 0.08;
        cam.vy += (cam.targetVy - cam.vy) * 0.08;

        cam.x += cam.vx * (dt / 16);
        cam.y += cam.vy * (dt / 16);

        // If targetVx is 0, softly bring vx to pure 0
        if (Math.abs(cam.targetVx) < 0.01 && Math.abs(cam.vx) < 0.02) cam.vx = 0;
        if (Math.abs(cam.targetVy) < 0.01 && Math.abs(cam.vy) < 0.02) cam.vy = 0;
      }

      // Smooth zoom interpolation
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

      // Deep dark canvas background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric radial ambient
      const bgGrad = ctx.createRadialGradient(
        screenCenterX,
        screenCenterY,
        60,
        screenCenterX,
        screenCenterY,
        Math.max(width, height) * 0.85
      );
      bgGrad.addColorStop(0, '#151522');
      bgGrad.addColorStop(0.5, '#0a0a10');
      bgGrad.addColorStop(1, '#050507');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const books = booksRef.current;
      const booksCount = books.length;

      if (booksCount === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // Stacked Hexagonal Grid Parameters
      const cols = 18;
      const rows = Math.ceil(booksCount / cols);

      // Card dimensions
      const cardW = 68 * cam.zoom;
      const cardH = 100 * cam.zoom;

      // Tight steps so cards overlap like shingles / stacked decks
      const stepX = 56 * cam.zoom;
      const stepY = 80 * cam.zoom;

      // Spherical fisheye lens radius
      const lensRadius = Math.min(width, height) * 0.44 * Math.sqrt(cam.zoom);

      let closestBook: Book | null = null;
      let minDistanceToCenter = Infinity;

      interface StackedBook {
        book: Book;
        screenX: number;
        screenY: number;
        w: number;
        h: number;
        z: number;
        angle: number;
        dist: number;
        opacity: number;
      }

      const drawList: StackedBook[] = [];

      // Truly endless grid buffer covering generous margins around all 4 sides
      const bufferPadding = Math.max(width, height) * 0.45;
      const minCol = Math.floor((-cam.x - screenCenterX - bufferPadding) / stepX) - 3;
      const maxCol = Math.ceil((width - cam.x - screenCenterX + bufferPadding) / stepX) + 3;
      const minRow = Math.floor((-cam.y - screenCenterY - bufferPadding) / stepY) - 3;
      const maxRow = Math.ceil((height - cam.y - screenCenterY + bufferPadding) / stepY) + 3;

      for (let r = minRow; r <= maxRow; r++) {
        const rowWrapped = ((r % rows) + rows) % rows;
        // Hexagonal offset: alternate rows offset by 50%
        const offsetX = (r % 2) * (stepX * 0.5);

        for (let c = minCol; c <= maxCol; c++) {
          const colWrapped = ((c % cols) + cols) % cols;
          const bookIndex = rowWrapped * cols + colWrapped;
          const book = books[bookIndex % booksCount];
          if (!book) continue;

          // Undistorted screen position
          const baseX = screenCenterX + c * stepX + offsetX + cam.x;
          const baseY = screenCenterY + r * stepY + cam.y;

          let screenX = baseX;
          let screenY = baseY;
          let z = 0;
          let scale = 1.0;
          let opacity = 0.88;
          let angle = 0;
          let dist = 9999;

          if (cam.hasActiveMouse) {
            const dx = baseX - cam.lensX;
            const dy = baseY - cam.lensY;
            dist = Math.hypot(dx, dy);
            angle = Math.atan2(dy, dx);

            if (dist < lensRadius) {
              const normDist = dist / lensRadius;
              z = Math.sqrt(Math.max(0, 1.0 - normDist * normDist));

              const pushFactor = 1.0 + 0.45 * Math.pow(1.0 - normDist, 1.5);
              const curvedDist = dist * pushFactor;

              screenX = cam.lensX + Math.cos(angle) * curvedDist;
              screenY = cam.lensY + Math.sin(angle) * curvedDist;

              scale = 0.95 + Math.pow(z, 1.4) * 1.25;
              opacity = 0.75 + z * 0.25;
            } else {
              scale = 0.94;
              opacity = 0.85;
            }
          } else {
            scale = 0.94;
            opacity = 0.88;
          }

          const w = cardW * scale;
          const h = cardH * scale;

          // Frustum culling with safety margin
          if (
            screenX + w < -80 ||
            screenX - w > width + 80 ||
            screenY + h < -80 ||
            screenY - h > height + 80
          ) {
            continue;
          }

          // Active card under cursor
          if (cam.hasActiveMouse && dist < lensRadius) {
            const distToLens = Math.hypot(screenX - cam.lensX, screenY - cam.lensY);
            if (distToLens < minDistanceToCenter && z > 0.3) {
              minDistanceToCenter = distToLens;
              closestBook = book;
            }
          }

          drawList.push({
            book,
            screenX,
            screenY,
            w,
            h,
            z,
            angle,
            dist,
            opacity,
          });
        }
      }

      // Sort by depth so closer / higher z cards are drawn ON TOP of further cards
      drawList.sort((a, b) => a.z - b.z);

      // Render each stacked book card
      for (let i = 0; i < drawList.length; i++) {
        const item = drawList[i];
        const { book, screenX, screenY, w, h, z, angle, opacity } = item;

        const isFocused = focusedBookRef.current?.id === book.id && z > 0.35;
        const isHovered = closestBook?.id === book.id;

        ctx.save();
        ctx.globalAlpha = opacity;

        ctx.translate(screenX, screenY);

        // Subtle 3D tilt
        if (z > 0 && z < 0.95) {
          const tiltAmount = (1.0 - z) * 0.05;
          ctx.rotate(angle * 0.15 * tiltAmount);
        }

        const halfW = w / 2;
        const halfH = h / 2;
        const cornerRadius = Math.max(3, 7 * (w / cardW));

        // Physical stacked card drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = Math.min(30, 8 + 18 * z);
        ctx.shadowOffsetX = 2 + 3 * z;
        ctx.shadowOffsetY = 3 + 6 * z;

        // Rounded card boundary
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfH, w, h, cornerRadius);
        ctx.clip();

        // Draw book cover or fallback
        const src = book.cover || book.cover_url;
        const img = imagesRef.current.get(src);

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -halfW, -halfH, w, h);
        } else {
          const hash = book.id * 47;
          const hue = hash % 360;
          ctx.fillStyle = `hsl(${hue}, 28%, 15%)`;
          ctx.fillRect(-halfW, -halfH, w, h);

          // Spine groove
          ctx.fillStyle = `hsl(${hue}, 38%, 24%)`;
          ctx.fillRect(-halfW, -halfH, Math.max(3, w * 0.12), h);

          if (w > 40) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = `600 ${Math.max(8, Math.floor(w * 0.11))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(book.title.slice(0, 16), 0, 0);
          }
        }

        // Spherical surface shading
        if (z < 0.88) {
          const shade = (1.0 - z) * 0.42;
          ctx.fillStyle = `rgba(0, 0, 0, ${shade})`;
          ctx.fillRect(-halfW, -halfH, w, h);
        }

        ctx.restore();

        // Radiant focus border ring on active card
        if (isFocused || isHovered) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = isFocused ? 2.5 : 1.5;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = isFocused ? 22 : 10;

          ctx.beginPath();
          ctx.roundRect(-halfW - 2, -halfH - 2, w + 4, h + 4, cornerRadius + 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Throttled store update for focused book
      if (time - lastHoverCheckTime > 75) {
        lastHoverCheckTime = time;
        if (cam.hasActiveMouse && closestBook && closestBook.id !== focusedBookRef.current?.id) {
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

  // Global window pointermove so moving towards window edges NEVER stops or cancels!
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

      if (cam.isDragging) {
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
  }, []);

  // Wheel Zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomDelta = e.deltaY * -0.0012;
      cam.targetZoom = Math.max(0.42, Math.min(2.5, cam.targetZoom + zoomDelta));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Pointer Down on container starts drag
  const handlePointerDown = (e: React.PointerEvent) => {
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
    // Only register click if not a drag gesture
    const cam = cameraRef.current;
    const dragDist = Math.hypot(e.clientX - cam.dragStartX, e.clientY - cam.dragStartY);
    if (dragDist < 6) {
      const current = focusedBookRef.current;
      if (current) {
        useBookStore.getState().setSelectedBook(current);
        onSelectBook?.(current);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#060608]"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
