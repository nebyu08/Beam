'use client';

import React, { useEffect, useRef } from 'react';
import { GeoBook } from '@/lib/geo-types';
import {
  createSiteHash,
  fillSiteHash,
  layoutWave,
  nearestSite,
  type WaveLayout,
} from '@/lib/wave-layout';

export type WaveVariant = 'fit' | 'world';

interface WaveFieldProps {
  books: GeoBook[];
  seed: string;
  variant: WaveVariant;
  label: string;
  suspended?: boolean;
  spotlightId?: number | null;
  spotlightNonce?: number;
  onSelect?: (book: GeoBook) => void;
  onActiveChange?: (book: GeoBook | null) => void;
  onUnavailable?: () => void;
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

// Original weighted Voronoi. nothing-to-watch's shaders are CC-BY-NC-SA and are not used here.
const FRAG = `#version 300 es
precision highp float;
in vec2 vPx;
out vec4 fragColor;

uniform vec2 uResolution;
uniform vec2 uCamera;
uniform float uZoom;
uniform vec2 uPitch;
uniform vec2 uCellPx;
uniform vec2 uHashOrigin;
uniform float uHashCell;
uniform vec2 uHashSize;
uniform vec2 uGrid;
uniform int uHover;
uniform int uSiteW;
uniform highp sampler2D uSites;
uniform highp sampler2D uHash;
uniform highp sampler2DArray uCovers;
uniform highp sampler2D uSharp;
uniform int uSharpIndex;

void consider(float idf, vec2 world, inout float d1, inout float d2, inout int i1, inout int i2) {
  if (idf < 0.0) return;
  int id = int(idf + 0.5);
  int x = id - (id / uSiteW) * uSiteW;
  int y = id / uSiteW;
  vec4 site = texelFetch(uSites, ivec2(x, y), 0);
  vec2 delta = world - site.xy;
  float dist = dot(delta, delta) - site.z;
  if (dist < d1) {
    d2 = d1;
    i2 = i1;
    d1 = dist;
    i1 = id;
  } else if (dist < d2 && id != i1) {
    d2 = dist;
    i2 = id;
  }
}

vec3 sampleCover(int index, vec2 posterUv) {
  if (index == uSharpIndex) {
    vec2 sharpUv = clamp(posterUv, 0.0, 1.0);
    sharpUv = sharpUv * 0.994 + 0.003;
    return texture(uSharp, sharpUv).rgb;
  }
  vec2 cell = clamp(posterUv, 0.0, 1.0);
  vec2 inset = 1.15 / max(uCellPx, vec2(1.0));
  cell = cell * (vec2(1.0) - inset * 2.0) + inset;
  int cols = int(uGrid.x + 0.5);
  int rows = int(uGrid.y + 0.5);
  int per = cols * rows;
  int layer = index / per;
  int local = index - layer * per;
  int col = local - (local / cols) * cols;
  int row = local / cols;
  vec2 uv = (vec2(float(col), float(row)) + cell) / vec2(float(cols), float(rows));
  return texture(uCovers, vec3(uv, float(layer))).rgb;
}

void main() {
  vec2 world = (vPx - uResolution * 0.5) / max(uZoom, 0.0001) + uCamera;
  float d1 = 1e20;
  float d2 = 1e20;
  int i1 = -1;
  int i2 = -1;
  ivec2 cell = ivec2(floor((world - uHashOrigin) / uHashCell));
  for (int oy = -1; oy <= 1; oy++) {
    for (int ox = -1; ox <= 1; ox++) {
      ivec2 hc = cell + ivec2(ox, oy);
      if (hc.x < 0 || hc.y < 0 || hc.x >= int(uHashSize.x) || hc.y >= int(uHashSize.y)) continue;
      vec4 slots = texelFetch(uHash, hc, 0);
      consider(slots.x, world, d1, d2, i1, i2);
      consider(slots.y, world, d1, d2, i1, i2);
      consider(slots.z, world, d1, d2, i1, i2);
      consider(slots.w, world, d1, d2, i1, i2);
    }
  }
  if (uHover >= 0) consider(float(uHover), world, d1, d2, i1, i2);
  if (i1 < 0) {
    fragColor = vec4(0.027, 0.027, 0.031, 1.0);
    return;
  }

  int sx = i1 - (i1 / uSiteW) * uSiteW;
  int sy = i1 / uSiteW;
  vec4 site = texelFetch(uSites, ivec2(sx, sy), 0);
  float grow = sqrt(max(site.z, 0.25));
  float open = clamp((grow - 1.0) / 0.82, 0.0, 1.0);
  float cover = mix(0.64, 1.82, open);
  float halfW = uPitch.x * cover;
  float halfH = uPitch.y * cover;
  vec2 posterUv = (world - site.xy) / vec2(halfW * 2.0, halfH * 2.0) + 0.5;
  vec3 color = sampleCover(i1, posterUv);

  if (uHover >= 0) color *= i1 == uHover ? 1.06 : 0.9;
  if (i2 >= 0) {
    float gap = d2 - d1;
    float seam = smoothstep(0.0, max(fwidth(gap) * 0.45, 0.0012), gap);
    color *= mix(0.94, 1.0, seam);
  }
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

function jacketHue(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}

function sharperCover(url: string) {
  return url.replace(/-[MS]\.(jpe?g|png|webp)$/i, '-L.$1');
}

function thumbCover(url: string) {
  return url.replace(/-[ML]\.(jpe?g|png|webp)$/i, '-S.$1');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cellSize(variant: WaveVariant, count: number) {
  if (variant === 'world') return { w: 48, h: 72 };
  if (count <= 4) return { w: 480, h: 720 };
  if (count <= 16) return { w: 280, h: 420 };
  if (count <= 40) return { w: 200, h: 300 };
  return { w: 160, h: 240 };
}

function atlasGrid(count: number, cellW: number, cellH: number, maxSize: number) {
  const maxCols = Math.max(1, Math.floor(maxSize / cellW));
  const maxRows = Math.max(1, Math.floor(maxSize / cellH));
  let cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(count * (cellH / cellW)))));
  let rows = Math.ceil(count / cols);
  if (rows > maxRows || cols * rows < count) {
    cols = maxCols;
    rows = maxRows;
  }
  rows = Math.max(1, Math.min(maxRows, rows));
  const per = cols * rows;
  const layers = Math.max(1, Math.ceil(count / per));
  return { cols, rows, per, layers, width: cols * cellW, height: rows * cellH };
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, limit: number) {
  const words = (text.trim() || 'Untitled').split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= limit) break;
  }
  if (line && lines.length < limit) lines.push(line);
  return lines;
}

function paintJacket(
  ctx: CanvasRenderingContext2D,
  book: GeoBook,
  cellW: number,
  cellH: number,
  fontFamily: string,
) {
  const hue = jacketHue(book.title || book.author || 'book');
  ctx.fillStyle = `hsl(${hue} 32% 16%)`;
  ctx.fillRect(0, 0, cellW, cellH);
  const wash = ctx.createLinearGradient(0, 0, cellW, cellH);
  wash.addColorStop(0, `hsl(${hue} 38% 28%)`);
  wash.addColorStop(1, `hsl(${(hue + 18) % 360} 26% 10%)`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, cellW, cellH);

  if (cellH < 90) return;

  const pad = Math.round(cellW * 0.18);
  const maxWidth = cellW - pad * 2;
  let size = Math.round(cellW * 0.13);
  ctx.fillStyle = '#f4f1ea';
  ctx.textBaseline = 'top';
  let lines: string[] = [];
  while (size >= 12) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    lines = wrapLines(ctx, book.title || 'Untitled', maxWidth, 5);
    const widest = Math.max(...(book.title || 'Untitled').split(/\s+/).map((word) => ctx.measureText(word).width), 0);
    if (widest <= maxWidth && lines.length <= 4) break;
    size -= 2;
  }
  const lineHeight = Math.round(size * 1.18);
  const authorSize = Math.max(12, Math.round(cellW * 0.07));
  ctx.font = `500 ${authorSize}px ${fontFamily}`;
  const author = wrapLines(ctx, book.author || 'Unknown author', maxWidth, 2);
  const authorHeight = Math.round(authorSize * 1.25);
  const block = lines.length * lineHeight + Math.round(cellH * 0.05) + author.length * authorHeight;
  let cursor = Math.max(pad, Math.round((cellH - block) / 2));
  ctx.font = `600 ${size}px ${fontFamily}`;
  ctx.fillStyle = '#f4f1ea';
  for (const line of lines) {
    ctx.fillText(line, pad, cursor);
    cursor += lineHeight;
  }
  cursor += Math.round(cellH * 0.05);
  ctx.font = `500 ${authorSize}px ${fontFamily}`;
  ctx.fillStyle = '#efeae2';
  for (const line of author) {
    ctx.fillText(line, pad, cursor);
    cursor += authorHeight;
  }
}

function paintPhoto(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  cellW: number,
  cellH: number,
) {
  const ratio = image.width / Math.max(image.height, 1);
  const cellRatio = cellW / cellH;
  let dw: number;
  let dh: number;
  if (ratio > cellRatio) {
    dh = cellH;
    dw = cellH * ratio;
  } else {
    dw = cellW;
    dh = cellW / ratio;
  }
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, cellW, cellH);
  ctx.drawImage(image, (cellW - dw) / 2, (cellH - dh) / 2, dw, dh);
}

function slotOf(index: number, cols: number, per: number) {
  const layer = Math.floor(index / per);
  const local = index - layer * per;
  return { layer, col: local % cols, row: Math.floor(local / cols) };
}

export default function WaveField({
  books,
  seed,
  variant,
  label,
  suspended = false,
  spotlightId = null,
  spotlightNonce = 0,
  onSelect,
  onActiveChange,
  onUnavailable,
}: WaveFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onActiveChangeRef = useRef(onActiveChange);
  const onUnavailableRef = useRef(onUnavailable);
  const booksRef = useRef(books);
  const suspendedRef = useRef(suspended);
  const spotlightRef = useRef({ id: spotlightId, nonce: spotlightNonce });
  const activeRef = useRef<number | null>(null);
  const bookKey = `${variant}:${seed}:${books.length}:${books[0]?.id ?? 0}:${books[books.length - 1]?.id ?? 0}`;

  useEffect(() => {
    onSelectRef.current = onSelect;
    onActiveChangeRef.current = onActiveChange;
    onUnavailableRef.current = onUnavailable;
    booksRef.current = books;
    suspendedRef.current = suspended;
    spotlightRef.current = { id: spotlightId, nonce: spotlightNonce };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const selection = booksRef.current;
    if (!canvas || !root || selection.length === 0) return;

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
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

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
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      camera: gl.getUniformLocation(program, 'uCamera'),
      zoom: gl.getUniformLocation(program, 'uZoom'),
      pitch: gl.getUniformLocation(program, 'uPitch'),
      cellPx: gl.getUniformLocation(program, 'uCellPx'),
      hashOrigin: gl.getUniformLocation(program, 'uHashOrigin'),
      hashCell: gl.getUniformLocation(program, 'uHashCell'),
      hashSize: gl.getUniformLocation(program, 'uHashSize'),
      grid: gl.getUniformLocation(program, 'uGrid'),
      hover: gl.getUniformLocation(program, 'uHover'),
      siteW: gl.getUniformLocation(program, 'uSiteW'),
      sites: gl.getUniformLocation(program, 'uSites'),
      hash: gl.getUniformLocation(program, 'uHash'),
      covers: gl.getUniformLocation(program, 'uCovers'),
      sharp: gl.getUniformLocation(program, 'uSharp'),
      sharpIndex: gl.getUniformLocation(program, 'uSharpIndex'),
    };

    const count = selection.length;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reducedQuery.matches;
    const onReduce = () => {
      reduced = reducedQuery.matches;
    };
    reducedQuery.addEventListener('change', onReduce);

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, variant === 'world' ? 1 : 1.75);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      return { width, height, cssWidth: Math.max(rect.width, 1), cssHeight: Math.max(rect.height, 1) };
    };

    let view = measure();
    let layoutAspect = variant === 'fit' ? view.cssWidth / view.cssHeight : 1.65;
    let layout: WaveLayout = layoutWave(count, seed, layoutAspect);
    const displayX = new Float32Array(count);
    const displayY = new Float32Array(count);
    const targetX = new Float32Array(count);
    const targetY = new Float32Array(count);
    const weight = new Float32Array(count);
    displayX.set(layout.restX);
    displayY.set(layout.restY);
    for (let i = 0; i < count; i += 1) weight[i] = layout.vary[i];

    const siteW = Math.max(1, Math.ceil(Math.sqrt(count)));
    const siteH = Math.max(1, Math.ceil(count / siteW));
    const siteData = new Float32Array(siteW * siteH * 4);

    const margin = 2.2;
    let hash = createSiteHash(
      layout.minX - margin,
      layout.minY - margin,
      layout.maxX + margin,
      layout.maxY + margin,
      layout.spacing,
    );
    fillSiteHash(hash, count, displayX, displayY);

    const siteTex = gl.createTexture();
    const hashTex = gl.createTexture();
    const coverTex = gl.createTexture();
    const sharpTex = gl.createTexture();

    const allocDataTex = (texture: WebGLTexture | null, width: number, height: number, data: Float32Array) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    };
    allocDataTex(siteTex, siteW, siteH, siteData);
    allocDataTex(hashTex, hash.cols, hash.rows, hash.slots);
    if (gl.getError() !== gl.NO_ERROR) {
      onUnavailableRef.current?.();
      return;
    }

    const maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
    const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
    let thumb = cellSize(variant, count);
    let grid = atlasGrid(count, thumb.w, thumb.h, Math.min(maxTex, variant === 'world' ? 2048 : 4096));
    if (grid.layers > maxLayers) {
      thumb = { w: 32, h: 48 };
      grid = atlasGrid(count, thumb.w, thumb.h, Math.min(maxTex, 1024));
    }

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, coverTex);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA,
      grid.width,
      grid.height,
      grid.layers,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    if (gl.getError() !== gl.NO_ERROR) {
      onUnavailableRef.current?.();
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, sharpTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const blank = document.createElement('canvas');
    blank.width = 2;
    blank.height = 2;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blank);

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim() ||
      'sans-serif';
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = grid.width;
    layerCanvas.height = grid.height;
    const layerCtx = layerCanvas.getContext('2d');
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = thumb.w;
    cellCanvas.height = thumb.h;
    const cellCtx = cellCanvas.getContext('2d');
    if (!layerCtx || !cellCtx) {
      onUnavailableRef.current?.();
      return;
    }

    const uploadCell = (index: number) => {
      const slot = slotOf(index, grid.cols, grid.per);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, coverTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        slot.col * thumb.w,
        slot.row * thumb.h,
        slot.layer,
        thumb.w,
        thumb.h,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        cellCanvas,
      );
    };

    const paintIndex = (index: number, image?: CanvasImageSource & { width: number; height: number }) => {
      const book = selection[index];
      if (!book) return;
      if (image) paintPhoto(cellCtx, image, thumb.w, thumb.h);
      else paintJacket(cellCtx, book, thumb.w, thumb.h, fontFamily);
      uploadCell(index);
    };

    for (let layer = 0; layer < grid.layers; layer += 1) {
      layerCtx.fillStyle = '#121214';
      layerCtx.fillRect(0, 0, grid.width, grid.height);
      const start = layer * grid.per;
      const end = Math.min(count, start + grid.per);
      for (let index = start; index < end; index += 1) {
        const slot = slotOf(index, grid.cols, grid.per);
        const hue = jacketHue(selection[index].title || selection[index].author || 'book');
        layerCtx.fillStyle = `hsl(${hue} 30% ${14 + (index % 5)}%)`;
        layerCtx.fillRect(slot.col * thumb.w, slot.row * thumb.h, thumb.w, thumb.h);
      }
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, coverTex);
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        layer,
        grid.width,
        grid.height,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        layerCanvas,
      );
    }

    if (variant === 'fit') {
      for (let index = 0; index < count; index += 1) paintIndex(index);
    }

    let cameraX = (layout.minX + layout.maxX) / 2;
    let cameraY = (layout.minY + layout.maxY) / 2;
    let zoom = 1;
    let targetCameraX = cameraX;
    let targetCameraY = cameraY;
    let targetZoom = zoom;
    let sharpIndex = -1;
    let sharpToken = 0;
    let seenSpotlight = -1;
    let frame = 0;
    let alive = true;
    let last = performance.now();
    let snapped = false;
    let nextPump = 0;
    let inflight = 0;
    const status = new Uint8Array(count);
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; camX: number; camY: number; moved: boolean } | null = null;
    let pinch: { dist: number; zoom: number; cx: number; cy: number } | null = null;

    const worldSize = () => ({
      worldW: Math.max(0.001, layout.maxX - layout.minX),
      worldH: Math.max(0.001, layout.maxY - layout.minY),
    });

    const zoomLimits = () => {
      const { worldW, worldH } = worldSize();
      const fit = Math.min(view.width / worldW, view.height / worldH) * 0.92;
      const maxZoom = 520 / layout.pitchX;
      return { minZoom: Math.min(fit, maxZoom), maxZoom };
    };

    const frameFit = () => {
      const { worldW, worldH } = worldSize();
      zoom = Math.max(view.width / worldW, view.height / worldH) * 1.04;
      targetZoom = zoom;
      cameraX = (layout.minX + layout.maxX) / 2;
      cameraY = (layout.minY + layout.maxY) / 2;
      targetCameraX = cameraX;
      targetCameraY = cameraY;
    };

    const frameWorld = () => {
      const limits = zoomLimits();
      const byHeight = view.height / (8 * layout.pitchY);
      const byWidth = view.width / (13 * layout.pitchX);
      const readable = Math.min(byHeight, byWidth);
      zoom = clamp(readable, limits.minZoom, limits.maxZoom);
      targetZoom = zoom;
      cameraX = (layout.minX + layout.maxX) / 2;
      cameraY = (layout.minY + layout.maxY) / 2;
      targetCameraX = cameraX;
      targetCameraY = cameraY;
    };

    if (variant === 'fit') frameFit();
    else frameWorld();

    const screenToWorld = (px: number, py: number) => ({
      x: (px - view.width / 2) / zoom + cameraX,
      y: (py - view.height / 2) / zoom + cameraY,
    });

    const clientToCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * view.width,
        y: ((clientY - rect.top) / rect.height) * view.height,
      };
    };

    const pick = (px: number, py: number) => {
      const world = screenToWorld(px, py);
      const best = nearestSite(world.x, world.y, count, displayX, displayY, weight, hash);
      const hover = activeRef.current;
      if (hover == null || hover < 0 || hover >= count) return best;
      const hx = world.x - displayX[hover];
      const hy = world.y - displayY[hover];
      const hoverDist = hx * hx + hy * hy - weight[hover];
      if (best < 0) return hover;
      const bx = world.x - displayX[best];
      const by = world.y - displayY[best];
      if (hoverDist < bx * bx + by * by - weight[best]) return hover;
      return best;
    };

    const setActive = (index: number | null) => {
      if (activeRef.current === index) return;
      activeRef.current = index;
      onActiveChangeRef.current?.(index == null ? null : selection[index] ?? null);
    };

    const requestSharp = (index: number) => {
      const book = selection[index];
      const src = book?.cover || book?.cover_url;
      sharpIndex = -1;
      if (!src) return;
      const token = ++sharpToken;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const large = sharperCover(src);
      let attempt = 0;
      const candidates = large === src ? [src] : [large, src];
      image.onload = () => {
        if (!alive || token !== sharpToken) return;
        if (image.naturalWidth < 24) {
          attempt += 1;
          if (attempt < candidates.length) image.src = candidates[attempt];
          return;
        }
        gl.bindTexture(gl.TEXTURE_2D, sharpTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        sharpIndex = index;
      };
      image.onerror = () => {
        attempt += 1;
        if (attempt < candidates.length && alive && token === sharpToken) image.src = candidates[attempt];
      };
      image.src = candidates[0];
    };

    const startLoad = (index: number) => {
      const book = selection[index];
      const src = book?.cover || book?.cover_url;
      if (!src) {
        status[index] = 3;
        if (variant === 'fit') paintIndex(index);
        return;
      }
      status[index] = 1;
      inflight += 1;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      const small = variant === 'world' ? thumbCover(src) : src;
      const candidates = small === src ? [src] : [small, src];
      let attempt = 0;
      const fail = () => {
        attempt += 1;
        if (attempt < candidates.length && alive) {
          image.src = candidates[attempt];
          return;
        }
        inflight = Math.max(0, inflight - 1);
        if (!alive) return;
        status[index] = 3;
        paintIndex(index);
      };
      image.onload = () => {
        if (!alive) {
          inflight = Math.max(0, inflight - 1);
          return;
        }
        if (image.naturalWidth < 24) {
          fail();
          return;
        }
        inflight = Math.max(0, inflight - 1);
        try {
          paintIndex(index, image);
          status[index] = 2;
        } catch {
          status[index] = 3;
          paintIndex(index);
        }
      };
      image.onerror = fail;
      image.src = candidates[0];
    };

    const pumpLimit = variant === 'world' ? 16 : 6;
    const pump = () => {
      if (!alive || inflight >= pumpLimit) return;
      const ranked: { index: number; dist: number }[] = [];
      const hover = activeRef.current;
      for (let index = 0; index < count; index += 1) {
        if (status[index] !== 0) continue;
        const sx = (displayX[index] - cameraX) * zoom + view.width / 2;
        const sy = (displayY[index] - cameraY) * zoom + view.height / 2;
        const marginPx = Math.max(layout.pitchX, layout.pitchY) * zoom * (variant === 'fit' ? 2.4 : 1.4);
        const visible =
          variant === 'fit' ||
          (sx > -marginPx && sy > -marginPx && sx < view.width + marginPx && sy < view.height + marginPx);
        if (!visible) continue;
        const dist = (sx - view.width / 2) ** 2 + (sy - view.height / 2) ** 2;
        ranked.push({ index, dist: index === hover ? -1 : dist });
      }
      ranked.sort((a, b) => a.dist - b.dist);
      for (const item of ranked) {
        if (inflight >= pumpLimit) break;
        startLoad(item.index);
      }
    };

    const relayoutFit = () => {
      const aspect = view.cssWidth / view.cssHeight;
      layoutAspect = aspect;
      layout = layoutWave(count, seed, aspect);
      hash = createSiteHash(
        layout.minX - margin,
        layout.minY - margin,
        layout.maxX + margin,
        layout.maxY + margin,
        layout.spacing,
      );
      displayX.set(layout.restX);
      displayY.set(layout.restY);
      snapped = false;
      gl.bindTexture(gl.TEXTURE_2D, hashTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, hash.cols, hash.rows, 0, gl.RGBA, gl.FLOAT, hash.slots);
      frameFit();
    };

    const focusIndex = (index: number, readablePx: number) => {
      if (index < 0 || index >= count) return;
      setActive(index);
      if (variant !== 'world') return;
      targetCameraX = layout.restX[index];
      targetCameraY = layout.restY[index];
      const limits = zoomLimits();
      const readable = readablePx / layout.pitchX;
      if (zoom < readable) targetZoom = clamp(readable, limits.minZoom, limits.maxZoom);
    };

    const draw = (now: number) => {
      if (!alive) return;
      if (document.hidden) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      view = measure();
      if (variant === 'fit') {
        const aspect = view.cssWidth / view.cssHeight;
        if (Math.abs(aspect - layoutAspect) > 0.08) relayoutFit();
        else frameFit();
      }

      const spotlight = spotlightRef.current;
      if (variant === 'world' && spotlight.nonce !== seenSpotlight && spotlight.id != null) {
        seenSpotlight = spotlight.nonce;
        const index = selection.findIndex((book) => book.id === spotlight.id);
        focusIndex(index, 190);
      }

      const hover = activeRef.current;
      const spring = 1 - Math.exp(-dt * (reduced ? 18 : 10));
      const time = now * 0.001;
      const amp = reduced ? 0 : (variant === 'fit' ? 0.045 : 0.11);
      let pointerWorld: { x: number; y: number } | null = null;
      if (pointerRef.x != null && pointerRef.y != null) {
        pointerWorld = screenToWorld(pointerRef.x, pointerRef.y);
      }

      for (let i = 0; i < count; i += 1) {
        const phase = layout.phase[i];
        const x =
          layout.restX[i] +
          Math.sin(layout.restY[i] * 0.62 + time * 0.46 + phase) * amp * 1.15;
        const y =
          layout.restY[i] +
          Math.sin(layout.restX[i] * 0.24 + time * 0.32) * amp * 1.7 +
          Math.sin(layout.restY[i] * 0.38 + phase * 0.6 - time * 0.18) * amp * 0.45;
        targetX[i] = x;
        targetY[i] = y;
      }

      if (hover != null && hover >= 0 && hover < count) {
        const originX = targetX[hover];
        const originY = targetY[hover];
        if (pointerWorld) {
          const dx = pointerWorld.x - originX;
          const dy = pointerWorld.y - originY;
          const dist = Math.hypot(dx, dy) || 1;
          const mag = Math.min(dist, 0.2);
          targetX[hover] += (dx / dist) * mag * 0.55;
          targetY[hover] += (dy / dist) * mag * 0.55;
        }
        for (let i = 0; i < count; i += 1) {
          if (i === hover) continue;
          const dx = targetX[i] - originX;
          const dy = targetY[i] - originY;
          const dist = Math.hypot(dx, dy) || 1;
          const falloff = Math.exp(-dist / 2.6);
          targetX[i] += (dx / dist) * falloff * 0.26;
          targetY[i] += (dy / dist) * falloff * 0.38;
        }
      }

      const loX = layout.minX - 1.3;
      const hiX = layout.maxX + 1.3;
      const loY = layout.minY - 1.3;
      const hiY = layout.maxY + 1.3;
      for (let i = 0; i < count; i += 1) {
        const tx = clamp(targetX[i], loX, hiX);
        const ty = clamp(targetY[i], loY, hiY);
        if (!snapped) {
          displayX[i] = tx;
          displayY[i] = ty;
        } else {
          displayX[i] += (tx - displayX[i]) * spring;
          displayY[i] += (ty - displayY[i]) * spring;
        }
        const varied = layout.vary[i];
        const targetW = (hover === i ? (variant === 'world' ? 2.7 : 2.5) : 1) * varied;
        weight[i] += (targetW - weight[i]) * spring;
        const offset = i * 4;
        siteData[offset] = displayX[i];
        siteData[offset + 1] = displayY[i];
        siteData[offset + 2] = weight[i];
      }
      snapped = true;

      if (variant === 'world') {
        const ease = 1 - Math.exp(-dt * 7);
        cameraX += (targetCameraX - cameraX) * ease;
        cameraY += (targetCameraY - cameraY) * ease;
        zoom += (targetZoom - zoom) * ease;
        const limits = zoomLimits();
        zoom = clamp(zoom, limits.minZoom, limits.maxZoom);
        targetZoom = clamp(targetZoom, limits.minZoom, limits.maxZoom);
        const { worldW, worldH } = worldSize();
        const viewW = view.width / zoom;
        const viewH = view.height / zoom;
        if (worldW <= viewW) {
          cameraX = (layout.minX + layout.maxX) / 2;
          targetCameraX = cameraX;
        } else {
          const slack = viewW * 0.18;
          const minX = layout.minX + viewW / 2 - slack;
          const maxX = layout.maxX - viewW / 2 + slack;
          cameraX = clamp(cameraX, minX, maxX);
          targetCameraX = clamp(targetCameraX, minX, maxX);
        }
        if (worldH <= viewH) {
          cameraY = (layout.minY + layout.maxY) / 2;
          targetCameraY = cameraY;
        } else {
          const slack = viewH * 0.18;
          const minY = layout.minY + viewH / 2 - slack;
          const maxY = layout.maxY - viewH / 2 + slack;
          cameraY = clamp(cameraY, minY, maxY);
          targetCameraY = clamp(targetCameraY, minY, maxY);
        }
      }

      fillSiteHash(hash, count, displayX, displayY);
      gl.bindTexture(gl.TEXTURE_2D, siteTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, siteW, siteH, gl.RGBA, gl.FLOAT, siteData);
      gl.bindTexture(gl.TEXTURE_2D, hashTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, hash.cols, hash.rows, gl.RGBA, gl.FLOAT, hash.slots);

      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, view.width, view.height);
      gl.uniform2f(uniforms.resolution, view.width, view.height);
      gl.uniform2f(uniforms.camera, cameraX, cameraY);
      gl.uniform1f(uniforms.zoom, zoom);
      gl.uniform2f(uniforms.pitch, layout.pitchX, layout.pitchY);
      gl.uniform2f(uniforms.cellPx, thumb.w, thumb.h);
      gl.uniform2f(uniforms.hashOrigin, hash.originX, hash.originY);
      gl.uniform1f(uniforms.hashCell, hash.cell);
      gl.uniform2f(uniforms.hashSize, hash.cols, hash.rows);
      gl.uniform2f(uniforms.grid, grid.cols, grid.rows);
      gl.uniform1i(uniforms.hover, hover == null ? -1 : hover);
      gl.uniform1i(uniforms.siteW, siteW);
      gl.uniform1i(uniforms.sharpIndex, sharpIndex);
      gl.uniform1i(uniforms.sites, 1);
      gl.uniform1i(uniforms.hash, 2);
      gl.uniform1i(uniforms.covers, 3);
      gl.uniform1i(uniforms.sharp, 4);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, siteTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, hashTex);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, coverTex);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, sharpTex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (now > nextPump) {
        nextPump = now + (variant === 'world' ? 40 : 180);
        pump();
      }
      frame = requestAnimationFrame(draw);
    };

    const pointerRef: { x: number | null; y: number | null } = { x: null, y: null };
    let sharpPending = -2;

    const syncSharp = () => {
      const hover = activeRef.current;
      if (hover == null) {
        sharpIndex = -1;
        sharpPending = -1;
        return;
      }
      if (sharpPending === hover) return;
      sharpPending = hover;
      requestSharp(hover);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (suspendedRef.current) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (variant !== 'world') return;
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinch = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          zoom,
          cx: (pts[0].x + pts[1].x) / 2,
          cy: (pts[0].y + pts[1].y) / 2,
        };
        drag = null;
        return;
      }
      drag = { x: event.clientX, y: event.clientY, camX: cameraX, camY: cameraY, moved: false };
      pinch = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (suspendedRef.current) return;
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const point = clientToCanvas(event.clientX, event.clientY);
      if (!point) return;
      pointerRef.x = point.x;
      pointerRef.y = point.y;

      if (pinch && pointers.size >= 2 && variant === 'world') {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const mid = clientToCanvas((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        if (mid) {
          const before = screenToWorld(mid.x, mid.y);
          const limits = zoomLimits();
          zoom = clamp(pinch.zoom * (dist / pinch.dist), limits.minZoom, limits.maxZoom);
          targetZoom = zoom;
          const after = screenToWorld(mid.x, mid.y);
          cameraX += before.x - after.x;
          cameraY += before.y - after.y;
          targetCameraX = cameraX;
          targetCameraY = cameraY;
        }
        return;
      }

      if (drag && variant === 'world') {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (dx * dx + dy * dy > 16) drag.moved = true;
        const scale = view.width / Math.max(canvas.getBoundingClientRect().width, 1);
        cameraX = drag.camX - (dx * scale) / zoom;
        cameraY = drag.camY - (dy * scale) / zoom;
        targetCameraX = cameraX;
        targetCameraY = cameraY;
        canvas.style.cursor = 'grabbing';
      }

      const index = pick(point.x, point.y);
      setActive(index < 0 ? null : index);
      syncSharp();
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasDrag = drag?.moved ?? false;
      const wasPinch = pinch != null && pointers.size >= 2;
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        drag = null;
        canvas.style.cursor = variant === 'world' ? 'grab' : 'pointer';
      }
      if (wasDrag || wasPinch || suspendedRef.current) return;
      if (event.pointerType === 'touch' && pointers.size > 0) return;
      const point = clientToCanvas(event.clientX, event.clientY);
      if (!point) return;
      const index = pick(point.x, point.y);
      if (index < 0) return;
      setActive(index);
      const book = selection[index];
      if (book) onSelectRef.current?.(book);
    };

    const onPointerLeave = () => {
      pointerRef.x = null;
      pointerRef.y = null;
      if (pointers.size === 0) {
        setActive(null);
        sharpIndex = -1;
        sharpPending = -1;
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (variant !== 'world' || suspendedRef.current) return;
      event.preventDefault();
      const point = clientToCanvas(event.clientX, event.clientY);
      if (!point) return;
      const before = screenToWorld(point.x, point.y);
      const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const limits = zoomLimits();
      zoom = clamp(zoom * Math.exp(-dy * 0.00115), limits.minZoom, limits.maxZoom);
      targetZoom = zoom;
      const after = screenToWorld(point.x, point.y);
      cameraX += before.x - after.x;
      cameraY += before.y - after.y;
      targetCameraX = cameraX;
      targetCameraY = cameraY;
    };

    const onKey = (event: KeyboardEvent) => {
      if (suspendedRef.current) return;
      const target = event.target;
      if (target instanceof Element && target.closest('button, a, input, textarea')) return;
      const typing =
        document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (typing) return;
      if (event.key === 'Enter') {
        if (activeRef.current == null) return;
        event.preventDefault();
        const book = selection[activeRef.current];
        if (book) onSelectRef.current?.(book);
        return;
      }
      const dirs: Record<string, [number, number]> = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const dir = dirs[event.key];
      const jump = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
      if (!dir && jump == null) return;
      event.preventDefault();
      let next = jump ?? 0;
      if (dir) {
        const current = activeRef.current ?? 0;
        let best = -1;
        let bestScore = Infinity;
        for (let i = 0; i < count; i += 1) {
          if (i === current) continue;
          const dx = displayX[i] - displayX[current];
          const dy = displayY[i] - displayY[current];
          const dist = Math.hypot(dx, dy);
          if (dist < 0.001) continue;
          const dot = (dx / dist) * dir[0] + (dy / dist) * dir[1];
          if (dot < 0.4) continue;
          const score = dist / dot;
          if (score < bestScore) {
            bestScore = score;
            best = i;
          }
        }
        if (best < 0) return;
        next = best;
      }
      focusIndex(next, 160);
      syncSharp();
    };

    canvas.style.cursor = variant === 'world' ? 'grab' : 'pointer';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    const observer = new ResizeObserver(() => {
      view = measure();
    });
    observer.observe(root);
    root.focus({ preventScroll: true });
    frame = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      reducedQuery.removeEventListener('change', onReduce);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      observer.disconnect();
      gl.deleteTexture(siteTex);
      gl.deleteTexture(hashTex);
      gl.deleteTexture(coverTex);
      gl.deleteTexture(sharpTex);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteVertexArray(vao);
    };
  }, [bookKey, seed, variant]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 bg-[#070708] outline-none"
      tabIndex={0}
      role="application"
      aria-label={label}
    >
      <canvas ref={canvasRef} className="h-full w-full touch-none" aria-hidden="true" />
    </div>
  );
}
