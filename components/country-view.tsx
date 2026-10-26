'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

type Point = { x: number; y: number };

function clipPolygon(
  polygon: Point[],
  inside: (point: Point) => boolean,
  intersect: (start: Point, end: Point) => Point
) {
  const next: Point[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentInside = inside(current);
    const previousInside = inside(previous);
    if (currentInside) {
      if (!previousInside) next.push(intersect(previous, current));
      next.push(current);
    } else if (previousInside) {
      next.push(intersect(previous, current));
    }
  }
  return next;
}

function voronoi(sites: Point[], width: number, height: number) {
  const bounds: Point[] = [
    { x: -40, y: -40 },
    { x: width + 40, y: -40 },
    { x: width + 40, y: height + 40 },
    { x: -40, y: height + 40 },
  ];

  return sites.map((site, siteIndex) => {
    let polygon = bounds;
    for (let otherIndex = 0; otherIndex < sites.length; otherIndex += 1) {
      if (otherIndex === siteIndex || polygon.length < 3) continue;
      const other = sites[otherIndex];
      const midX = (site.x + other.x) / 2;
      const midY = (site.y + other.y) / 2;
      const normalX = site.x - other.x;
      const normalY = site.y - other.y;
      polygon = clipPolygon(
        polygon,
        (point) => (point.x - midX) * normalX + (point.y - midY) * normalY >= -0.5,
        (start, end) => {
          const startSide = (start.x - midX) * normalX + (start.y - midY) * normalY;
          const endSide = (end.x - midX) * normalX + (end.y - midY) * normalY;
          const mix = startSide / (startSide - endSide || 1);
          return {
            x: start.x + (end.x - start.x) * mix,
            y: start.y + (end.y - start.y) * mix,
          };
        }
      );
    }
    return polygon;
  });
}

function baseSites(count: number, width: number, height: number) {
  const columns = Math.max(1, Math.round(Math.sqrt(count * (width / Math.max(height, 1)))));
  const rows = Math.ceil(count / columns);
  const sites: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const inRow = Math.min(columns, count - row * columns);
    const cellWidth = width / inRow;
    const cellHeight = height / rows;
    const jitterX = ((((index * 97) % 100) / 100) - 0.5) * cellWidth * 0.62;
    const jitterY = ((((index * 53) % 100) / 100) - 0.5) * cellHeight * 0.62;
    sites.push({
      x: Math.min(width - 48, Math.max(48, ((column + 0.5) / inRow) * width + jitterX)),
      y: Math.min(height - 48, Math.max(48, ((row + 0.5) / rows) * height + jitterY)),
    });
  }
  return sites;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

export default function CountryView({
  country,
  onSelectBook,
}: CountryViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false });
  const sitesRef = useRef<Point[]>([]);
  const imagesRef = useRef<Map<number, HTMLImageElement | 'failed'>>(new Map());
  const hoverIdRef = useRef<number | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hoverBook, setHoverBook] = useState<GeoBook | null>(null);

  useEffect(() => {
    imagesRef.current = new Map();
    for (const book of country.books) {
      const src = book.cover || book.cover_url;
      if (!src) {
        imagesRef.current.set(book.id, 'failed');
        continue;
      }
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth < 24) imagesRef.current.set(book.id, 'failed');
      };
      image.onerror = () => {
        imagesRef.current.set(book.id, 'failed');
      };
      image.src = src;
      imagesRef.current.set(book.id, image);
    }
  }, [country]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    const drawn = { sites: [] as Point[] };

    const render = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#050505';
      context.fillRect(0, 0, width, height);

      const books = country.books;
      if (books.length === 0) {
        frame = requestAnimationFrame(render);
        return;
      }

      const bases = baseSites(books.length, width, height);
      const pointer = pointerRef.current;
      let nearest = 0;
      let nearestDistance = Infinity;
      bases.forEach((site, index) => {
        const distance = Math.hypot(site.x - pointer.x, site.y - pointer.y);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });

      const targets = bases.map((site, index) => {
        if (!pointer.inside) return site;
        const dx = site.x - pointer.x;
        const dy = site.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (index === nearest) {
          return {
            x: site.x + (pointer.x - site.x) * 0.42,
            y: site.y + (pointer.y - site.y) * 0.42,
          };
        }
        const push = Math.exp(-distance / 260) * 84;
        return { x: site.x + (dx / distance) * push, y: site.y + (dy / distance) * push };
      });

      if (drawn.sites.length !== targets.length) {
        drawn.sites = targets.map((site) => ({ ...site }));
      }
      drawn.sites.forEach((site, index) => {
        site.x += (targets[index].x - site.x) * 0.16;
        site.y += (targets[index].y - site.y) * 0.16;
      });
      sitesRef.current = drawn.sites;

      const cells = voronoi(drawn.sites, width, height);
      books.forEach((book, index) => {
        const polygon = cells[index];
        if (!polygon || polygon.length < 3) return;
        let centerX = 0;
        let centerY = 0;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const point of polygon) {
          centerX += point.x;
          centerY += point.y;
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
        centerX /= polygon.length;
        centerY /= polygon.length;
        const inset = polygon.map((point) => ({
          x: centerX + (point.x - centerX) * 0.992,
          y: centerY + (point.y - centerY) * 0.992,
        }));

        context.save();
        context.beginPath();
        context.moveTo(inset[0].x, inset[0].y);
        for (const point of inset.slice(1)) context.lineTo(point.x, point.y);
        context.closePath();
        context.clip();

        const loaded = imagesRef.current.get(book.id);
        const image = loaded instanceof HTMLImageElement && loaded.complete && loaded.naturalWidth > 24
          ? loaded
          : null;
        const boxWidth = Math.max(maxX - minX, 1);
        const boxHeight = Math.max(maxY - minY, 1);
        if (image) {
          const ratio = image.naturalWidth / image.naturalHeight;
          const boxRatio = boxWidth / boxHeight;
          let drawWidth = boxWidth;
          let drawHeight = boxHeight;
          let drawX = minX;
          let drawY = minY;
          if (ratio > boxRatio) {
            drawHeight = boxHeight;
            drawWidth = boxHeight * ratio;
            drawX = minX - (drawWidth - boxWidth) / 2;
          } else {
            drawWidth = boxWidth;
            drawHeight = boxWidth / ratio;
            drawY = minY - (drawHeight - boxHeight) / 2;
          }
          context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
          if (pointer.inside && index === nearest) {
            context.fillStyle = 'rgba(0,0,0,0.18)';
            context.fillRect(minX, minY, boxWidth, boxHeight);
          }
        } else {
          context.fillStyle = index === nearest && pointer.inside ? '#1c1c1f' : '#121214';
          context.fillRect(minX, minY, boxWidth, boxHeight);
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = '#f4f4f5';
          context.font = '600 26px sans-serif';
          const lines = wrapText(context, book.title, boxWidth * 0.7);
          const blockHeight = lines.length * 32;
          lines.forEach((line, lineIndex) => {
            context.fillText(line, centerX, centerY - blockHeight / 2 + lineIndex * 32);
          });
          context.fillStyle = '#d4d4d8';
          context.font = '16px sans-serif';
          context.fillText(book.author, centerX, centerY + blockHeight / 2 + 8);
        }
        context.restore();
      });

      const hovered = pointer.inside ? books[nearest] : null;
      if ((hovered?.id ?? null) !== hoverIdRef.current) {
        hoverIdRef.current = hovered?.id ?? null;
        setHoverBook(hovered);
      }
      if (labelRef.current) {
        const labelX = Math.min(pointer.x + 18, width - 280);
        const labelY = Math.min(pointer.y + 18, height - 88);
        labelRef.current.style.transform = `translate(${labelX}px, ${labelY}px)`;
        labelRef.current.style.opacity = hovered ? '1' : '0';
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [country]);

  const selectAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let nearest = 0;
    let nearestDistance = Infinity;
    sitesRef.current.forEach((site, index) => {
      const distance = Math.hypot(site.x - x, site.y - y);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    const book = country.books[nearest];
    if (book) onSelectBook?.(book);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 bg-black">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-pointer"
        onPointerMove={(event) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          pointerRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            inside: true,
          };
        }}
        onPointerLeave={() => {
          pointerRef.current.inside = false;
        }}
        onClick={(event) => selectAt(event.clientX, event.clientY)}
      />

      <div className="pointer-events-none absolute right-4 top-4 z-30 max-w-[46vw] text-right sm:right-6 sm:top-5">
        <p className="text-sm font-medium text-white sm:text-base">
          <span className="mr-1.5">{country.flag}</span>
          {country.name}
        </p>
        <p className="text-xs text-zinc-300">
          {country.books.length} {country.books.length === 1 ? 'book' : 'books'}
        </p>
      </div>

      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 z-30 w-64 rounded-2xl bg-black/85 px-3.5 py-2.5 opacity-0 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)]"
      >
        {hoverBook && (
          <>
            <p className="text-sm font-semibold leading-snug text-white">{hoverBook.title}</p>
            <p className="mt-1 text-xs text-zinc-300">
              {hoverBook.author}
              {hoverBook.year > 0 ? ` · ${hoverBook.year}` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function BackToGlobeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-4 top-4 z-[70] inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6 sm:top-5"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to globe
      <kbd className="rounded-md bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700">
        Esc
      </kbd>
    </button>
  );
}
