'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';

interface BookSphereProps {
  onSelectBook?: (book: Book) => void;
}

export default function BookSphere({ onSelectBook }: BookSphereProps) {
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

  // Infinite Camera & Physics state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetVx: 0,
    targetVy: 0,
    targetX: null as number | null,
    targetY: null as number | null,
    zoom: 0.46,
    targetZoom: 0.46,
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

    currentPreviewIdRef.current = selectedBook.id;
    setPreviewBook(selectedBook);

    const books = booksRef.current;
    const index = books.findIndex((b) => b.id === selectedBook.id);
    if (index === -1) return;

    const cols = 20;
    const col = index % cols;
    const row = Math.floor(index / cols);

    const targetZoom = 0.95;
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
      const screenCenterY = height / 2;

      // Unify Camera & Mouse: smooth mouse and lens tracking
      if (cam.hasActiveMouse) {
        cam.mouseX += (cam.targetMouseX - cam.mouseX) * 0.18;
        cam.mouseY += (cam.targetMouseY - cam.mouseY) * 0.18;
        cam.lensX += (cam.mouseX - cam.lensX) * 0.22;
        cam.lensY += (cam.mouseY - cam.lensY) * 0.22;

        // Continuous fluid gliding whenever pointer leaves center deadzone
        // Moves seamlessly towards corners, far-left, far-right with no edge dead-ends
        if (!cam.isDragging) {
          const normX = (cam.mouseX - screenCenterX) / screenCenterX; // -1 to +1
          const normY = (cam.mouseY - screenCenterY) / screenCenterY; // -1 to +1
          const distFromCenter = Math.hypot(normX, normY);

          if (distFromCenter > 0.08) {
            const speedFactor = Math.pow(Math.min(1.0, (distFromCenter - 0.08) / 0.92), 1.25);
            const maxSpeed = 17.0 * Math.max(0.65, cam.zoom);
            cam.targetVx = -(normX / distFromCenter) * speedFactor * maxSpeed;
            cam.targetVy = -(normY / distFromCenter) * speedFactor * maxSpeed;
          } else {
            cam.targetVx = 0;
            cam.targetVy = 0;
          }
        }
      } else {
        cam.targetVx = 0;
        cam.targetVy = 0;
      }

      // If manual dragging or edge-flying, cancel auto-swoop
      if (cam.isDragging || Math.abs(cam.targetVx) > 0.1 || Math.abs(cam.targetVy) > 0.1) {
        cam.targetX = null;
        cam.targetY = null;
      }

      // Smooth camera swoop towards target book coordinates
      if (cam.targetX !== null && cam.targetY !== null && !cam.isDragging) {
        const diffX = cam.targetX - cam.x;
        const diffY = cam.targetY - cam.y;
        cam.x += diffX * 0.06;
        cam.y += diffY * 0.06;
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

      // Dark basalt ground background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      // Atmospheric radial ambient centered directly at the lens / cursor position
      const bgGrad = ctx.createRadialGradient(
        cam.lensX,
        cam.lensY,
        40,
        cam.lensX,
        cam.lensY,
        Math.max(width, height) * 0.85
      );
      bgGrad.addColorStop(0, '#151522');
      bgGrad.addColorStop(0.5, '#090910');
      bgGrad.addColorStop(1, '#050507');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const books = booksRef.current;
      const booksCount = books.length;

      if (booksCount === 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // Organic molded pebble dimensions (standard 1:1.46 ratio)
      const cols = 20;
      const rows = Math.ceil(booksCount / cols);

      const cardW = 74 * cam.zoom;
      const cardH = 108 * cam.zoom;

      // Tight pebble spacing for interlocking molten stone mosaic
      const stepX = 77 * cam.zoom;
      const stepY = 111 * cam.zoom;

      // Wide elastic lens radius that smoothly encompasses screen corners
      const lensRadius = Math.max(width, height) * 0.58 * Math.sqrt(cam.zoom);

      let closestBook: Book | null = null;
      let closestCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };
      let directHitBook: Book | null = null;
      let directHitCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };
      let highestDirectBulge = -1;
      let minDistanceToLens = Infinity;
      let lensBook: Book | null = null;
      let lensCoords = { screenX: 0, screenY: 0, w: 0, h: 0 };

      interface MoldedPebble {
        book: Book;
        screenX: number;
        screenY: number;
        w: number;
        h: number;
        totalBulge: number;
        dist: number;
        opacity: number;
      }

      const drawList: MoldedPebble[] = [];

      // Truly endless grid buffer covering wide margins
      const bufferPadding = Math.max(width, height) * 0.5;
      const minCol = Math.floor((-cam.x - screenCenterX - bufferPadding) / stepX) - 3;
      const maxCol = Math.ceil((width - cam.x - screenCenterX + bufferPadding) / stepX) + 3;
      const minRow = Math.floor((-cam.y - screenCenterY - bufferPadding) / stepY) - 3;
      const maxRow = Math.ceil((height - cam.y - screenCenterY + bufferPadding) / stepY) + 3;

      for (let r = minRow; r <= maxRow; r++) {
        const rowWrapped = ((r % rows) + rows) % rows;
        // Hexagonal / staggered stone offset for natural stone matrix
        const offsetX = (r % 2) * (stepX * 0.5);

        for (let c = minCol; c <= maxCol; c++) {
          const colWrapped = ((c % cols) + cols) % cols;
          const bookIndex = rowWrapped * cols + colWrapped;
          const book = books[bookIndex % booksCount];
          if (!book) continue;

          // Undistorted grid position
          const baseX = screenCenterX + c * stepX + offsetX + cam.x;
          const baseY = screenCenterY + r * stepY + cam.y;

          let screenX = baseX;
          let screenY = baseY;
          let scale = 1.0;
          let totalBulge = 0;
          let opacity = 0.92;
          let dist = 9999;

          if (cam.hasActiveMouse) {
            const dx = baseX - cam.lensX;
            const dy = baseY - cam.lensY;
            dist = Math.hypot(dx, dy);

            if (dist < lensRadius) {
              const normDist = dist / lensRadius; // 0 to 1

              // Smooth elastic bulge falloff (Nothing to Watch formula)
              const bulge = Math.pow(Math.max(0, 1.0 - normDist), 1.8);

              // Fluid harmonic ripple wave (Nothing to Watch RIPPLE formula)
              const ripple = Math.sin(normDist * 16.0 - time * 0.0032) * 0.06 * (1.0 - normDist);
              totalBulge = Math.max(0, bulge + ripple);

              // Organic radial displacement: molds cells away from lens center like liquid stones
              const push = totalBulge * (cardW * 0.44);
              if (dist > 0.01) {
                screenX = baseX + (dx / dist) * push;
                screenY = baseY + (dy / dist) * push;
              }

              // Smooth magnification
              scale = 1.0 + totalBulge * 0.54;
              opacity = 0.90 + totalBulge * 0.1;
            }
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

          // Active pebble under cursor
          if (cam.hasActiveMouse && !cam.isDragging) {
            const isInside =
              Math.abs(screenX - cam.lensX) <= (w / 2) * 1.05 &&
              Math.abs(screenY - cam.lensY) <= (h / 2) * 1.05;

            if (isInside && totalBulge > highestDirectBulge) {
              highestDirectBulge = totalBulge;
              directHitBook = book;
              directHitCoords = { screenX, screenY, w, h };
            }

            if (dist < lensRadius) {
              const distToLens = Math.hypot(screenX - cam.lensX, screenY - cam.lensY);
              if (distToLens < minDistanceToLens && totalBulge > 0.3) {
                minDistanceToLens = distToLens;
                lensBook = book;
                lensCoords = { screenX, screenY, w, h };
              }
            }
          }

          drawList.push({
            book,
            screenX,
            screenY,
            w,
            h,
            totalBulge,
            dist,
            opacity,
          });
        }
      }

      if (directHitBook) {
        closestBook = directHitBook;
        closestCoords = directHitCoords;
      } else if (lensBook) {
        closestBook = lensBook;
        closestCoords = lensCoords;
      }

      // Render Molded Liquid Stone Tiles
      // No separate drop-shadow card stacking: seamless continuous molten pebble mosaic
      for (let i = 0; i < drawList.length; i++) {
        const item = drawList[i];
        const { book, screenX, screenY, w, h, totalBulge, opacity } = item;

        const isFocused =
          focusedBookRef.current?.id === book.id || selectedBookRef.current?.id === book.id;
        const isHovered = closestBook?.id === book.id;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(screenX, screenY);

        const halfW = w / 2;
        const halfH = h / 2;

        // Generous pillowed pebble squircle contour (like molten melting stone)
        const cornerRadius = Math.min(halfW, halfH) * 0.34;

        // Clip to organic rounded pebble boundary
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

          if (w > 40) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = `600 ${Math.max(8, Math.floor(w * 0.11))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(book.title.slice(0, 18), 0, 0);
          }
        }

        // 2. Molten rock inner vignette: dark molten edge melting into the dark basalt matrix
        const innerVignette = ctx.createRadialGradient(
          0,
          0,
          halfW * 0.45,
          0,
          0,
          Math.max(halfW, halfH)
        );
        innerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        innerVignette.addColorStop(0.75, 'rgba(0, 0, 0, 0.28)');
        innerVignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = innerVignette;
        ctx.fillRect(-halfW, -halfH, w, h);

        // 3. Tactile 3D molten sheen: smooth rounded liquid stone bevel lighting
        const stoneSheen = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        stoneSheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        stoneSheen.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
        stoneSheen.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
        stoneSheen.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = stoneSheen;
        ctx.fillRect(-halfW, -halfH, w, h);

        // 4. Subtle distance ambient dampening for stones far from the cursor
        if (totalBulge < 0.2 && !isFocused && !isHovered) {
          const dim = (0.2 - totalBulge) * 2.2;
          ctx.fillStyle = `rgba(0, 0, 0, ${dim * 0.35})`;
          ctx.fillRect(-halfW, -halfH, w, h);
        }

        ctx.restore();

        // Focused / Hovered Liquid Halo that hugs the molded pebble shape
        if (isFocused || isHovered) {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.strokeStyle = isFocused
            ? 'rgba(52, 211, 153, 0.95)'
            : 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = isFocused ? 2.5 : 1.8;
          ctx.shadowColor = isFocused ? '#34d399' : '#ffffff';
          ctx.shadowBlur = isFocused ? 18 : 12;

          ctx.beginPath();
          ctx.roundRect(-halfW - 1, -halfH - 1, w + 2, h + 2, cornerRadius + 1);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Update sleek floating near-pebble preview tag
      const floatingEl = floatingPreviewElRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (floatingEl) {
        let targetX = -9999;
        let targetY = -9999;
        let targetOpacity = 0;

        if (cam.hasActiveMouse && closestBook && !cam.isDragging && !selectedBookRef.current) {
          const cardCenterX = closestCoords.screenX / dpr;
          const cardCenterY = closestCoords.screenY / dpr;
          const cardHalfW = closestCoords.w / (2 * dpr);
          const cardHalfH = closestCoords.h / (2 * dpr);

          const containerW = width / dpr;
          const containerH = height / dpr;

          const previewW = 270;
          const previewH = 95;

          // Default: float to right of pebble
          let posX = cardCenterX + cardHalfW + 16;
          // Flip to left if overflowing
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

      // Throttled store update for focused book and preview
      if (time - lastHoverCheckTime > 50) {
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
  }, []);

  // Global window pointermove so moving towards window edges NEVER cancels
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
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#060608]"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Ethereal Preview Tag on Hover */}
      <div
        ref={floatingPreviewElRef}
        style={{ display: 'none', opacity: 0 }}
        className="pointer-events-none absolute top-0 left-0 z-20 w-72 p-3 rounded-2xl bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85)] text-zinc-100"
      >
        {previewBook && (
          <div className="flex items-start justify-between gap-3 select-none">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-zinc-400 truncate flex items-center gap-1.5 mb-0.5">
                <span className="truncate">{previewBook.author}</span>
                {previewBook.year > 0 && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {previewBook.year}
                    </span>
                  </>
                )}
              </p>

              <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                {previewBook.title}
              </h3>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-700/60 truncate max-w-[120px]">
                  {previewBook.genre}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                  Click to inspect ↗
                </span>
              </div>
            </div>

            {/* Circular Rating Dial */}
            <div
              className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800"
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
                    className="text-zinc-800"
                    fill="transparent"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r={10}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-emerald-400"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 10}
                    strokeDashoffset={
                      2 * Math.PI * 10 -
                      ((previewBook.rating || 85) / 100) * (2 * Math.PI * 10)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[8.5px] font-mono font-bold text-zinc-200">
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
