'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { GeoCountry, GeoBook } from '@/lib/geo-types';
import { ZoomIn, ZoomOut, RotateCcw, ChevronRight } from 'lucide-react';

interface EarthGlobeProps {
  countries: GeoCountry[];
  onSelectCountry: (country: GeoCountry) => void;
  hoveredCountry: GeoCountry | null;
  onHoverCountry: (country: GeoCountry | null) => void;
  interactive?: boolean;
}

export default function EarthGlobe({
  countries,
  onSelectCountry,
  hoveredCountry,
  onHoverCountry,
  interactive = true,
}: EarthGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Projection state
  const rotationRef = useRef<[number, number, number]>([-15, -20, 0]); // [yaw, pitch, roll]
  const targetRotationRef = useRef<[number, number, number] | null>(null);
  const velocityRef = useRef<[number, number]>([0, 0]);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<[number, number]>([0, 0]);
  const dragDistanceRef = useRef(0);
  const lastInteractTimeRef = useRef(0);
  const scaleRef = useRef<number>(300);
  const targetScaleRef = useRef<number>(300);

  // Topojson cached features
  const [worldFeatures, setWorldFeatures] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mouseScreenPos, setMouseScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Map country ID / name to GeoCountry for fast O(1) lookup
  const countryLookup = useMemo(() => {
    const map = new Map<string, GeoCountry>();
    for (const c of countries) {
      map.set(String(c.id), c);
      map.set(String(Number(c.id)), c);
      map.set(c.name.toLowerCase(), c);
      map.set(c.code.toLowerCase(), c);
    }
    return map;
  }, [countries]);

  // Load TopoJSON data
  useEffect(() => {
    let isMounted = true;
    async function loadTopology() {
      try {
        const res = await fetch('/data/countries-110m.json');
        if (!res.ok) throw new Error('Failed to load topology');
        const worldData = await res.json();
        const featureCollection = topojson.feature(
          worldData,
          worldData.objects.countries
        ) as any;

        if (isMounted) {
          setWorldFeatures(featureCollection.features || []);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Error loading world topology:', err);
      }
    }

    loadTopology();
    return () => {
      isMounted = false;
    };
  }, []);

  // Main Canvas Animation and Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || worldFeatures.length === 0) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (lastInteractTimeRef.current === 0) {
      lastInteractTimeRef.current = Date.now();
    }

    let animationFrameId: number;
    const graticule = d3.geoGraticule10();

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * 0.42;

      // Update scale smoothly
      if (targetScaleRef.current === 300) {
        targetScaleRef.current = baseScale;
        scaleRef.current = baseScale;
      } else {
        scaleRef.current += (targetScaleRef.current - scaleRef.current) * 0.1;
      }
      const currentScale = scaleRef.current;

      // Smooth camera interpolation towards target rotation (e.g. on country selection)
      if (targetRotationRef.current) {
        const [ty, tp, tr] = targetRotationRef.current;
        const [cyaw, cpitch, croll] = rotationRef.current;

        // Shortest angular distance interpolation
        let dyaw = ((ty - cyaw + 540) % 360) - 180;
        let dpitch = tp - cpitch;

        rotationRef.current[0] += dyaw * 0.08;
        rotationRef.current[1] += dpitch * 0.08;

        if (Math.abs(dyaw) < 0.2 && Math.abs(dpitch) < 0.2) {
          rotationRef.current = [ty, tp, tr];
          targetRotationRef.current = null;
        }
      } else if (!isDraggingRef.current) {
        // Apply inertia velocity
        const [vx, vy] = velocityRef.current;
        if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
          rotationRef.current[0] += vx;
          rotationRef.current[1] = Math.max(-65, Math.min(65, rotationRef.current[1] - vy));
          velocityRef.current = [vx * 0.94, vy * 0.94];
        } else {
          // Subtle idle auto-rotation if untouched for 2 seconds
          if (Date.now() - lastInteractTimeRef.current > 2000) {
            rotationRef.current[0] += 0.07;
          }
        }
      }

      // Configure d3 orthographic projection
      const projection = d3
        .geoOrthographic()
        .scale(currentScale)
        .translate([cx, cy])
        .rotate(rotationRef.current)
        .clipAngle(90);

      const path = d3.geoPath(projection, ctx);

      // --- 1. Atmospheric Outer Halo (Monochrome) ---
      const outerGlow = ctx.createRadialGradient(cx, cy, currentScale, cx, cy, currentScale * 1.15);
      outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
      outerGlow.addColorStop(0.35, 'rgba(255, 255, 255, 0.04)');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, currentScale * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // --- 2. Ocean Disc (Obsidian Black) ---
      const oceanGrad = ctx.createRadialGradient(
        cx - currentScale * 0.25,
        cy - currentScale * 0.25,
        currentScale * 0.1,
        cx,
        cy,
        currentScale
      );
      oceanGrad.addColorStop(0, '#151515');
      oceanGrad.addColorStop(0.55, '#090909');
      oceanGrad.addColorStop(1, '#000000');

      ctx.beginPath();
      ctx.arc(cx, cy, currentScale, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Atmospheric rim highlight
      ctx.beginPath();
      ctx.arc(cx, cy, currentScale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // --- 3. Graticules (Latitude & Longitude Lines) ---
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // --- 4. Render Landmass Polygons ---
      const [yaw, pitch] = rotationRef.current;
      const centerLonLat: [number, number] = [-yaw, -pitch];

      for (const feature of worldFeatures) {
        const idStr = String(feature.id);
        const name = (feature.properties?.name || '').toLowerCase();
        const matchedGeoCountry = countryLookup.get(idStr) || countryLookup.get(name);
        const isHovered =
          hoveredCountry &&
          (String(hoveredCountry.id) === idStr ||
            hoveredCountry.name.toLowerCase() === name);

        ctx.beginPath();
        path(feature);

        if (isHovered) {
          // Luminous white highlight on hover
          ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else if (matchedGeoCountry) {
          // Land with registered literary history
          ctx.fillStyle = '#1c1c1c';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          // Standard landmass
          ctx.fillStyle = '#0c0c0c';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // --- 5. Literary Beacons (Pulsing Capital Pins in Pure White) ---
      const now = performance.now();
      for (const country of countries) {
        const coord: [number, number] = [country.viewLng, country.viewLat];

        // Only draw beacons on the visible front hemisphere
        const angularDistance = d3.geoDistance(coord, centerLonLat);
        if (angularDistance > Math.PI / 2) continue;

        const screenPoint = projection(coord);
        if (!screenPoint) continue;
        const [bx, by] = screenPoint;

        const isHovered = hoveredCountry?.id === country.id;
        const pulse = ((now * 0.0018 + Number(country.id) * 0.3) % 1);
        const pulseRadius = 3 + pulse * 12;

        // Outer pulse wave
        ctx.beginPath();
        ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered
          ? `rgba(255, 255, 255, ${1 - pulse})`
          : `rgba(255, 255, 255, ${(1 - pulse) * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core luminous pin
        ctx.beginPath();
        ctx.arc(bx, by, isHovered ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = isHovered ? 14 : 5;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Country title label if hovered or high scale
        if (isHovered || currentScale > baseScale * 1.3) {
          ctx.font = '500 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(`${country.flag} ${country.name}`, bx + 8, by + 3);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [worldFeatures, countries, hoveredCountry, countryLookup]);

  // Handle Drag / Rotation Interaction
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = [e.clientX, e.clientY];
    dragDistanceRef.current = 0;
    velocityRef.current = [0, 0];
    targetRotationRef.current = null; // stop any ongoing auto-slerp
    lastInteractTimeRef.current = Date.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [interactive]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !interactive) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setMouseScreenPos({ x: e.clientX, y: e.clientY });

      if (isDraggingRef.current) {
        lastInteractTimeRef.current = Date.now();
        const [lastX, lastY] = lastMousePosRef.current;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        dragDistanceRef.current += Math.hypot(dx, dy);

        // Adjust rotation speed relative to scale
        const sensitivity = 0.25 * (300 / scaleRef.current);
        const nextYaw = rotationRef.current[0] + dx * sensitivity;
        const nextPitch = Math.max(-65, Math.min(65, rotationRef.current[1] - dy * sensitivity));

        rotationRef.current = [nextYaw, nextPitch, 0];
        velocityRef.current = [dx * sensitivity, dy * sensitivity];
        lastMousePosRef.current = [e.clientX, e.clientY];
      } else {
        // Country Hover Detection
        const cx = canvas.clientWidth / 2;
        const cy = canvas.clientHeight / 2;
        const projection = d3
          .geoOrthographic()
          .scale(scaleRef.current)
          .translate([cx, cy])
          .rotate(rotationRef.current)
          .clipAngle(90);

        const inverted = projection.invert ? projection.invert([mouseX, mouseY]) : null;

        if (inverted && !isNaN(inverted[0]) && !isNaN(inverted[1])) {
          let found: GeoCountry | null = null;
          for (const feature of worldFeatures) {
            if (d3.geoContains(feature, inverted)) {
              const idStr = String(feature.id);
              const name = (feature.properties?.name || '').toLowerCase();
              found = countryLookup.get(idStr) || countryLookup.get(name) || null;
              break;
            }
          }

          if (found !== hoveredCountry) {
            onHoverCountry(found);
          }
        } else {
          if (hoveredCountry !== null) {
            onHoverCountry(null);
          }
        }
      }
    },
    [worldFeatures, countryLookup, hoveredCountry, onHoverCountry, interactive]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }

      // If user barely moved the mouse, treat as a direct selection click
      if (dragDistanceRef.current < 6 && hoveredCountry) {
        // Trigger smooth centering slerp and then dive in
        targetRotationRef.current = [-hoveredCountry.viewLng, -hoveredCountry.viewLat, 0];
        targetScaleRef.current = scaleRef.current * 1.35;
        setTimeout(() => {
          onSelectCountry(hoveredCountry);
        }, 550);
      }
    },
    [hoveredCountry, onSelectCountry, interactive]
  );

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    lastInteractTimeRef.current = Date.now();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const baseScale = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const newScale = Math.max(baseScale * 0.7, Math.min(baseScale * 2.8, scaleRef.current * zoomFactor));
    targetScaleRef.current = newScale;
  }, [interactive]);

  const handleResetGlobe = () => {
    const baseScale = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    targetScaleRef.current = baseScale;
    targetRotationRef.current = [-15, -20, 0];
  };

  const handleZoom = (direction: 'in' | 'out') => {
    lastInteractTimeRef.current = Date.now();
    const baseScale = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const factor = direction === 'in' ? 1.3 : 0.75;
    targetScaleRef.current = Math.max(
      baseScale * 0.7,
      Math.min(baseScale * 2.8, scaleRef.current * factor)
    );
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-black">
      {/* 3D Black & White Earth Globe Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          hoveredCountry ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Minimal Floating HUD Tooltip when Hovering a Literary Nation (Monochrome) */}
      {interactive && hoveredCountry && mouseScreenPos && (
        <div
          className="fixed pointer-events-none z-30 transition-all duration-150 ease-out"
          style={{
            left: `${Math.min(window.innerWidth - 320, mouseScreenPos.x + 20)}px`,
            top: `${Math.min(window.innerHeight - 200, mouseScreenPos.y - 40)}px`,
          }}
        >
          <div className="w-72 p-4 rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-white">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{hoveredCountry.flag}</span>
                <div>
                  <h3 className="font-semibold text-sm tracking-wide text-white">
                    {hoveredCountry.name}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {hoveredCountry.books.length} canonical works
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>

            <p className="text-xs font-medium text-zinc-200 mb-2 line-clamp-1">
              {hoveredCountry.title}
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3 line-clamp-2 font-light">
              {hoveredCountry.tagline}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {hoveredCountry.authors.slice(0, 3).map((author) => (
                <span
                  key={author}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300"
                >
                  {author}
                </span>
              ))}
              {hoveredCountry.authors.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-zinc-500 font-mono">
                  +{hoveredCountry.authors.length - 3} more
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-300 font-medium">
              <span>Click to open this shelf</span>
              <span>Explore →</span>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Subtle Zoom Controls */}
      {interactive && (
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10 pointer-events-auto">
        <button
          onClick={() => handleZoom('in')}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetGlobe}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      )}
    </div>
  );
}
