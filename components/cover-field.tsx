'use client';

import React, { useEffect, useRef } from 'react';
import { GeoBook } from '@/lib/geo-types';

const MAX_BOOKS = 16;
const COLS = 4;
const CELL_W = 480;
const CELL_H = 720;

interface CoverFieldProps {
  books: GeoBook[];
  seed: string;
  onSelect?: (book: GeoBook) => void;
  onActiveChange?: (book: GeoBook | null) => void;
  onUnavailable?: () => void;
}

type Point = { nx: number; ny: number; phase: number };

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function jacketHue(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}

function sharperCover(url: string) {
  return url.replace(/-M\.(jpe?g|png|webp)$/i, '-L.$1');
}

function layoutPoints(count: number, aspect: number, seed: number): Point[] {
  if (count <= 1) return [{ nx: 0.5, ny: 0.46, phase: 0.4 }];

  const rng = mulberry32(seed);
  const cols = Math.max(1, Math.round(Math.sqrt(count * Math.max(aspect, 0.6))));
  const rows = Math.ceil(count / cols);
  const points: Point[] = [];
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    const inRow = row === rows - 1 ? count - index : cols;
    for (let col = 0; col < inRow; col += 1) {
      const gx = (col + 0.5) / inRow;
      const gy = (row + 0.5) / rows;
      points.push({
        nx: clamp(0.16 + gx * 0.68 + (rng() - 0.5) * (0.46 / cols), 0.14, 0.86),
        ny: clamp(0.16 + gy * 0.62 + (rng() - 0.5) * (0.4 / rows), 0.14, 0.74),
        phase: rng() * Math.PI * 2,
      });
      index += 1;
    }
  }

  for (let iter = 0; iter < 56; iter += 1) {
    for (let a = 0; a < points.length; a += 1) {
      let fx = 0;
      let fy = 0;
      for (let b = 0; b < points.length; b += 1) {
        if (a === b) continue;
        const dx = (points[a].nx - points[b].nx) * aspect;
        const dy = points[a].ny - points[b].ny;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = 0.92 / Math.sqrt(count);
        if (dist < minDist) {
          const push = ((minDist - dist) / dist) * 0.28;
          fx += (dx / aspect) * push;
          fy += dy * push;
        }
      }
      points[a].nx = clamp(points[a].nx + fx, 0.14, 0.86);
      points[a].ny = clamp(points[a].ny + fy, 0.15, 0.76);
    }
  }

  return points;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const source = text.trim() || 'Untitled';
  const words = source.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  const pushLong = (token: string) => {
    let current = '';
    for (const char of token) {
      const next = current + char;
      if (current && ctx.measureText(next).width > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    return current;
  };

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = ctx.measureText(word).width > maxWidth ? pushLong(word) : word;
    } else if (!line && ctx.measureText(word).width > maxWidth) {
      line = pushLong(word);
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 7);
}

function paintJacket(
  ctx: CanvasRenderingContext2D,
  book: GeoBook,
  x: number,
  y: number,
  fontFamily: string,
) {
  const hue = jacketHue(book.title || book.author || 'book');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, CELL_W, CELL_H);
  ctx.clip();

  ctx.fillStyle = `hsl(${hue} 34% 13%)`;
  ctx.fillRect(x, y, CELL_W, CELL_H);

  const wash = ctx.createLinearGradient(x, y, x + CELL_W, y + CELL_H);
  wash.addColorStop(0, `hsl(${hue} 42% 28%)`);
  wash.addColorStop(0.55, `hsl(${hue} 30% 14%)`);
  wash.addColorStop(1, `hsl(${(hue + 24) % 360} 28% 8%)`);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, CELL_W, CELL_H);

  const pad = 72;
  const maxWidth = CELL_W - pad * 2;
  const title = book.title || 'Untitled';
  let size = 54;
  let lines: string[] = [];
  while (size >= 30) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    const widest = Math.max(...title.split(/\s+/).map((word) => ctx.measureText(word).width), 0);
    lines = wrapLines(ctx, title, maxWidth);
    if (widest <= maxWidth && lines.length <= 6) break;
    size -= 2;
  }

  ctx.fillStyle = '#f6f4ef';
  ctx.textBaseline = 'top';
  let cursor = y + 132;
  const lineHeight = Math.round(size * 1.2);
  for (const line of lines) {
    ctx.fillText(line, x + pad, cursor);
    cursor += lineHeight;
  }

  ctx.strokeStyle = `hsla(${hue} 30% 72% / 0.45)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + pad, y + CELL_H - 168);
  ctx.lineTo(x + pad + 72, y + CELL_H - 168);
  ctx.stroke();

  ctx.font = `500 26px ${fontFamily}`;
  ctx.fillStyle = '#efeae2';
  const authorLines = wrapLines(ctx, book.author || 'Unknown author', maxWidth).slice(0, 2);
  authorLines.forEach((line, index) => {
    ctx.fillText(line, x + pad, y + CELL_H - 148 + index * 36);
  });

  ctx.restore();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
) {
  const ratio = image.width / image.height;
  const cellRatio = CELL_W / CELL_H;
  let dw: number;
  let dh: number;
  if (ratio > cellRatio) {
    dh = CELL_H;
    dw = CELL_H * ratio;
  } else {
    dw = CELL_W;
    dh = CELL_W / ratio;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, CELL_W, CELL_H);
  ctx.clip();
  ctx.drawImage(image, x + (CELL_W - dw) / 2, y + (CELL_H - dh) / 2, dw, dh);
  ctx.restore();
}

const VERT = `#version 300 es
uniform vec2 uResolution;
out vec2 vPx;
void main() {
  vec2 clip = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  vec2 uv = clip * 0.5 + 0.5;
  vPx = vec2(uv.x, 1.0 - uv.y) * uResolution;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vPx;
out vec4 fragColor;

uniform vec2 uResolution;
uniform int uCount;
uniform vec2 uSite[16];
uniform float uWeight[16];
uniform float uHalfW[16];
uniform sampler2D uAtlas;
uniform int uHover;
uniform float uMelt;
uniform float uReveal;

vec3 sampleCover(int index, vec2 p) {
  float halfW = max(uHalfW[index], 1.0);
  float halfH = halfW * 1.5;
  vec2 uv = (p - uSite[index]) / vec2(halfW * 2.0, halfH * 2.0) + 0.5;
  vec2 cell = clamp(uv, 0.0, 1.0);
  cell = cell * 0.992 + 0.004;
  float col = float(index - (index / 4) * 4);
  float row = float(index / 4);
  vec2 atlasUv = (vec2(col, row) + cell) / 4.0;
  return texture(uAtlas, atlasUv).rgb;
}

void main() {
  if (uCount < 1) {
    fragColor = vec4(0.02, 0.02, 0.024, 1.0);
    return;
  }

  float d1 = 1e20;
  float d2 = 1e20;
  int i1 = 0;
  int i2 = 0;
  for (int i = 0; i < 16; i++) {
    if (i >= uCount) break;
    float dist = dot(vPx - uSite[i], vPx - uSite[i]) - uWeight[i];
    if (dist < d1) {
      d2 = d1;
      i2 = i1;
      d1 = dist;
      i1 = i;
    } else if (dist < d2) {
      d2 = dist;
      i2 = i;
    }
  }

  vec3 c1 = sampleCover(i1, vPx);
  float dim1 = (uHover < 0 || i1 == uHover) ? 1.0 : 0.84;
  vec3 color = c1 * dim1;

  if (uCount > 1 && d2 < 1e19) {
    vec3 c2 = sampleCover(i2, vPx);
    float dim2 = (uHover < 0 || i2 == uHover) ? 1.0 : 0.84;
    float reach = max(length(vPx - uSite[i1]), 72.0);
    float band = uMelt;
    if (uHover >= 0 && (i1 == uHover || i2 == uHover)) band *= 0.58;
    float span = reach * max(band, 1.0);
    float blend = smoothstep(-1.0, 1.0, (d2 - d1) / span);
    color = mix(c2 * dim2, c1 * dim1, blend);
  }

  vec2 q = vPx / uResolution - 0.5;
  float vig = smoothstep(0.9, 0.35, length(q * vec2(1.02, 0.94)));
  color *= mix(0.9, 1.0, vig);
  color *= uReveal;
  fragColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function hitIndex(
  x: number,
  y: number,
  count: number,
  sites: Float32Array,
  weights: Float32Array,
) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i += 1) {
    const dx = x - sites[i * 2];
    const dy = y - sites[i * 2 + 1];
    const dist = dx * dx + dy * dy - weights[i];
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export default function CoverField({
  books,
  seed,
  onSelect,
  onActiveChange,
  onUnavailable,
}: CoverFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onActiveChangeRef = useRef(onActiveChange);
  const onUnavailableRef = useRef(onUnavailable);
  const booksRef = useRef(books);
  const activeRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const modeRef = useRef<'pointer' | 'keys'>('pointer');
  const liveRef = useRef({
    sites: new Float32Array(MAX_BOOKS * 2),
    weights: new Float32Array(MAX_BOOKS),
    count: 0,
  });

  const bookKey = books.map((book) => book.id).join('|');

  useEffect(() => {
    onSelectRef.current = onSelect;
    onActiveChangeRef.current = onActiveChange;
    onUnavailableRef.current = onUnavailable;
    booksRef.current = books;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const selection = booksRef.current.slice(0, MAX_BOOKS);
    if (selection.length === 0) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      onUnavailableRef.current?.();
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vertex || !fragment) {
      onUnavailableRef.current?.();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      onUnavailableRef.current?.();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      onUnavailableRef.current?.();
      return;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.useProgram(program);

    const atlas = document.createElement('canvas');
    atlas.width = COLS * CELL_W;
    atlas.height = COLS * CELL_H;
    const ctx = atlas.getContext('2d');
    if (!ctx) {
      onUnavailableRef.current?.();
      return;
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      count: gl.getUniformLocation(program, 'uCount'),
      site: gl.getUniformLocation(program, 'uSite[0]'),
      weight: gl.getUniformLocation(program, 'uWeight[0]'),
      halfW: gl.getUniformLocation(program, 'uHalfW[0]'),
      hover: gl.getUniformLocation(program, 'uHover'),
      melt: gl.getUniformLocation(program, 'uMelt'),
      reveal: gl.getUniformLocation(program, 'uReveal'),
      atlas: gl.getUniformLocation(program, 'uAtlas'),
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const aspect = root.clientWidth / Math.max(root.clientHeight, 1);
    const points = layoutPoints(selection.length, aspect || 1, hashSeed(seed));
    const zoom = new Float32Array(selection.length);
    zoom.fill(1);
    const displayX = new Float32Array(selection.length);
    const displayY = new Float32Array(selection.length);
    const siteData = new Float32Array(MAX_BOOKS * 2);
    const weightData = new Float32Array(MAX_BOOKS);
    const halfData = new Float32Array(MAX_BOOKS);
    let frame = 0;
    let cancelled = false;
    let uploaded = false;
    const started = performance.now();
    let last = started;

    const fontFamily = `"Noto Serif", "Noto Serif Ethiopic", "Noto Serif CJK JP", ${
      getComputedStyle(document.body).fontFamily || 'serif'
    }`;

    const paintAllJackets = () => {
      selection.forEach((book, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const x = col * CELL_W;
        const y = row * CELL_H;
        const photo = photos[index];
        if (photo) drawImageCover(ctx, photo, x, y);
        else paintJacket(ctx, book, x, y, fontFamily);
      });
    };

    const uploadAtlas = () => {
      if (cancelled) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      uploaded = true;
    };

    const paintCell = (index: number, image?: CanvasImageSource & { width: number; height: number }) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = col * CELL_W;
      const y = row * CELL_H;
      if (image && image.width > 24 && image.height > 24) {
        drawImageCover(ctx, image, x, y);
      } else {
        paintJacket(ctx, selection[index], x, y, fontFamily);
      }
      uploadAtlas();
    };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      return { width, height, dpr };
    };

    let size = resize();
    for (let i = 0; i < selection.length; i += 1) {
      const restX = points[i].nx * size.width;
      const restY = points[i].ny * size.height;
      const clustered = reduced ? 1 : 0.55;
      displayX[i] = size.width * 0.5 + (restX - size.width * 0.5) * clustered;
      displayY[i] = size.height * 0.46 + (restY - size.height * 0.46) * clustered;
    }

    const photos: Array<HTMLImageElement | null> = selection.map(() => null);

    const nearestFor = (index: number, width: number, height: number) => {
      if (selection.length === 1) return Math.hypot(width, height) * 0.62;
      let best = Infinity;
      for (let other = 0; other < selection.length; other += 1) {
        if (other === index) continue;
        const dx = (points[index].nx - points[other].nx) * width;
        const dy = (points[index].ny - points[other].ny) * height;
        best = Math.min(best, Math.hypot(dx, dy));
      }
      return best;
    };

    const draw = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      size = resize();
      const { width, height, dpr } = size;
      const elapsed = now - started;
      const reveal = reduced ? 1 : clamp(elapsed / 900, 0, 1);
      const spread = reduced ? 1 : 1 - (1 - reveal) ** 3;
      const spring = 1 - Math.exp(-dt * (reduced ? 18 : 8));
      const active = activeRef.current;
      const pointer = pointerRef.current;
      const amp = reduced ? 0 : Math.min(width, height) * 0.011;

      for (let i = 0; i < selection.length; i += 1) {
        const targetZoom = active === i ? 1.34 : 1;
        zoom[i] += (targetZoom - zoom[i]) * spring;

        const restX = points[i].nx * width;
        const restY = points[i].ny * height;
        let pushX = 0;
        let pushY = 0;
        if (!reduced && active != null && active < selection.length) {
          const originX = points[active].nx * width;
          const originY = points[active].ny * height;
          if (active === i && pointer) {
            const dx = pointer.x - restX;
            const dy = pointer.y - restY;
            const dist = Math.hypot(dx, dy) || 1;
            const mag = Math.min(dist, 18 * dpr) * 0.4;
            pushX = (dx / dist) * mag;
            pushY = (dy / dist) * mag;
          } else if (active !== i) {
            const dx = restX - originX;
            const dy = restY - originY;
            const dist = Math.hypot(dx, dy) || 1;
            const mag = 46 * dpr * Math.exp(-dist / (300 * dpr));
            pushX = (dx / dist) * mag;
            pushY = (dy / dist) * mag;
          }
        }

        const driftX = Math.sin(now * 0.00031 + points[i].phase) * amp;
        const driftY = Math.cos(now * 0.00027 + points[i].phase * 1.6) * amp * 0.75;
        const cx = width * 0.5;
        const cy = height * 0.46;
        const openedX = cx + (restX - cx) * (0.55 + 0.45 * spread) + pushX + driftX;
        const openedY = cy + (restY - cy) * (0.55 + 0.45 * spread) + pushY + driftY;
        displayX[i] += (openedX - displayX[i]) * spring;
        displayY[i] += (openedY - displayY[i]) * spring;

        const nearest = nearestFor(i, width, height);
        // The poster quad is sized to the cell, so the whole cover stays readable
        // while the voronoi edge crops it. A larger quad zooms into the middle.
        const halfW =
          selection.length === 1
            ? Math.max(width / 2, height / 3) * 1.04
            : nearest * 0.56 * zoom[i];
        const weight = nearest * nearest * 0.3 * zoom[i] * zoom[i];
        siteData[i * 2] = displayX[i];
        siteData[i * 2 + 1] = displayY[i];
        weightData[i] = weight;
        halfData[i] = halfW;
      }

      liveRef.current.count = selection.length;
      liveRef.current.sites.set(siteData);
      liveRef.current.weights.set(weightData);

      if (uploaded) {
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform1i(uniforms.count, selection.length);
        gl.uniform2fv(uniforms.site, siteData);
        gl.uniform1fv(uniforms.weight, weightData);
        gl.uniform1fv(uniforms.halfW, halfData);
        gl.uniform1i(uniforms.hover, active == null ? -1 : active);
        gl.uniform1f(uniforms.melt, 34 * dpr);
        gl.uniform1f(uniforms.reveal, 0.15 + 0.85 * spread);
        gl.uniform1i(uniforms.atlas, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      frame = requestAnimationFrame(draw);
    };

    let alive = true;
    const boot = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // Jackets still paint with the fallback face.
      }
      if (!alive) return;
      paintAllJackets();
      uploadAtlas();
      frame = requestAnimationFrame(draw);
    };
    void boot();

    selection.forEach((book, index) => {
      const src = book.cover || book.cover_url;
      if (!src) return;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      const candidates = [sharperCover(src)];
      if (candidates[0] !== src) candidates.push(src);
      let attempt = 0;
      const load = () => {
        image.src = candidates[attempt];
      };
      image.onload = () => {
        if (!alive) return;
        if (image.naturalWidth < 24 || image.naturalHeight < 24) {
          attempt += 1;
          if (attempt < candidates.length) load();
          return;
        }
        photos[index] = image;
        paintCell(index, image);
      };
      image.onerror = () => {
        attempt += 1;
        if (attempt < candidates.length) load();
      };
      load();
    });

    const onResize = () => {
      size = resize();
    };
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(root);

    return () => {
      alive = false;
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteVertexArray(vao);
    };
  }, [bookKey, seed]);

  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const pick = (x: number, y: number) => {
    const live = liveRef.current;
    if (live.count < 1) return 0;
    return hitIndex(x, y, live.count, live.sites, live.weights);
  };

  const setActive = (index: number | null, mode: 'pointer' | 'keys') => {
    modeRef.current = mode;
    if (activeRef.current === index) return;
    activeRef.current = index;
    const book = index == null ? null : booksRef.current[index] ?? null;
    onActiveChangeRef.current?.(book);
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
      tabIndex={0}
      role="group"
      aria-label="Books from this country. Use the arrow keys to move between them, and Enter to open one."
      onKeyDown={(event) => {
        const list = booksRef.current.slice(0, MAX_BOOKS);
        if (list.length === 0) return;
        if (event.key === 'Enter') {
          if (activeRef.current == null) return;
          event.preventDefault();
          onSelectRef.current?.(list[activeRef.current]);
          return;
        }
        const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
        if (!forward && !back && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        const current = activeRef.current ?? (back || event.key === 'End' ? 0 : -1);
        let next = 0;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = list.length - 1;
        else if (forward) next = (current + 1) % list.length;
        else next = (current - 1 + list.length) % list.length;
        setActive(next, 'keys');
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && rootRef.current?.contains(next)) return;
        setActive(null, 'pointer');
      }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer"
        aria-hidden="true"
        onPointerMove={(event) => {
          const point = pointFromEvent(event);
          if (!point) return;
          pointerRef.current = point;
          setActive(pick(point.x, point.y), 'pointer');
        }}
        onPointerLeave={() => {
          pointerRef.current = null;
          if (modeRef.current === 'pointer') setActive(null, 'pointer');
        }}
        onClick={(event) => {
          const point = pointFromEvent(event);
          if (!point) return;
          const index = pick(point.x, point.y);
          setActive(index, 'pointer');
          const book = booksRef.current[index];
          if (book) onSelectRef.current?.(book);
        }}
      />
      <ul className="sr-only">
        {books.slice(0, MAX_BOOKS).map((book, index) => (
          <li key={book.id}>
            <button
              type="button"
              onFocus={() => setActive(index, 'keys')}
              onClick={() => onSelectRef.current?.(book)}
            >
              {book.title} by {book.author}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
