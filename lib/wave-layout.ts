export interface WaveLayout {
  count: number;
  /** Spatial-hash cell. Not the poster pitch. */
  spacing: number;
  pitchX: number;
  pitchY: number;
  restX: Float32Array;
  restY: Float32Array;
  phase: Float32Array;
  vary: Float32Array;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

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

export function layoutWave(count: number, seed: string, aspect: number): WaveLayout {
  const pitchX = 1;
  const pitchY = 1.5;
  const spacing = 1.22;
  const restX = new Float32Array(count);
  const restY = new Float32Array(count);
  const phase = new Float32Array(count);
  const vary = new Float32Array(count);
  const homeX = new Float32Array(count);
  const homeY = new Float32Array(count);

  if (count === 0) {
    return {
      count,
      spacing,
      pitchX,
      pitchY,
      restX,
      restY,
      phase,
      vary,
      minX: 0,
      minY: 0,
      maxX: pitchX,
      maxY: pitchY,
    };
  }

  const rng = mulberry32(hashSeed(seed));
  const safeAspect = Math.max(aspect, 0.55);
  const cols = Math.max(1, Math.round(Math.sqrt((count * safeAspect * pitchY) / pitchX)));
  const rows = Math.ceil(count / cols);
  const inset = 0.38;
  const calm = count <= 140;
  const jitterX = calm ? 0.16 : 0.5;
  const jitterY = calm ? 0.12 : 0.36;
  const homePull = calm ? 0.09 : 0.02;
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    const inRow = Math.min(cols, count - index);
    const rowOffset = (cols - inRow) * 0.5;
    for (let col = 0; col < inRow; col += 1) {
      homeX[index] = (col + rowOffset + 0.5) * pitchX;
      homeY[index] = (row + 0.5) * pitchY;
      restX[index] = homeX[index] + (rng() - 0.5) * pitchX * jitterX;
      restY[index] = homeY[index] + (rng() - 0.5) * pitchY * jitterY;
      phase[index] = rng() * Math.PI * 2;
      vary[index] = calm ? 0.94 + rng() * 0.1 : 0.68 + rng() * 0.86;
      index += 1;
    }
  }

  const hashCols = cols + 2;
  const hashRows = rows + 2;
  const bins = new Int32Array(hashCols * hashRows);
  const next = new Int32Array(count);
  const minDist = 0.9;
  const iterations = count > 400 ? 7 : 12;

  for (let iter = 0; iter < iterations; iter += 1) {
    bins.fill(-1);
    for (let i = 0; i < count; i += 1) {
      const cx = clamp(Math.floor(restX[i] / pitchX), 0, hashCols - 1);
      const cy = clamp(Math.floor(restY[i] / pitchY), 0, hashRows - 1);
      const slot = cy * hashCols + cx;
      next[i] = bins[slot];
      bins[slot] = i;
    }

    for (let i = 0; i < count; i += 1) {
      let fx = (homeX[i] - restX[i]) * homePull;
      let fy = (homeY[i] - restY[i]) * homePull;
      const cx = clamp(Math.floor(restX[i] / pitchX), 0, hashCols - 1);
      const cy = clamp(Math.floor(restY[i] / pitchY), 0, hashRows - 1);
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const nx = cx + ox;
          const ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= hashCols || ny >= hashRows) continue;
          let other = bins[ny * hashCols + nx];
          while (other !== -1) {
            if (other !== i) {
              const dx = restX[i] - restX[other];
              const dy = restY[i] - restY[other];
              const dist = Math.hypot(dx / pitchX, dy / pitchY) || 0.0001;
              if (dist < minDist) {
                const push = ((minDist - dist) / dist) * 0.45;
                fx += (dx / dist) * push * pitchX * 0.55;
                fy += (dy / dist) * push * pitchY * 0.55;
              }
            }
            other = next[other];
          }
        }
      }
      restX[i] = clamp(restX[i] + fx, inset * pitchX, (cols - inset) * pitchX);
      restY[i] = clamp(restY[i] + fy, inset * pitchY, (rows - inset) * pitchY);
    }
  }

  return {
    count,
    spacing,
    pitchX,
    pitchY,
    restX,
    restY,
    phase,
    vary,
    minX: 0,
    minY: 0,
    maxX: cols * pitchX,
    maxY: rows * pitchY,
  };
}

export interface SiteHash {
  originX: number;
  originY: number;
  cell: number;
  cols: number;
  rows: number;
  slots: Float32Array;
}

const SLOTS = 4;

export function createSiteHash(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  spacing: number,
): SiteHash {
  const cell = spacing;
  const originX = minX - cell * 2;
  const originY = minY - cell * 2;
  const cols = Math.max(1, Math.ceil((maxX - minX) / cell) + 4);
  const rows = Math.max(1, Math.ceil((maxY - minY) / cell) + 4);
  const slots = new Float32Array(cols * rows * SLOTS);
  slots.fill(-1);
  return { originX, originY, cell, cols, rows, slots };
}

export function fillSiteHash(
  hash: SiteHash,
  count: number,
  x: ArrayLike<number>,
  y: ArrayLike<number>,
) {
  hash.slots.fill(-1);
  const { originX, originY, cell, cols, rows, slots } = hash;
  for (let i = 0; i < count; i += 1) {
    const cx = Math.floor((x[i] - originX) / cell);
    const cy = Math.floor((y[i] - originY) / cell);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
    const base = (cy * cols + cx) * SLOTS;
    let placed = false;
    for (let k = 0; k < SLOTS; k += 1) {
      if (slots[base + k] < 0) {
        slots[base + k] = i;
        placed = true;
        break;
      }
    }
    if (placed) continue;
    const ccx = originX + (cx + 0.5) * cell;
    const ccy = originY + (cy + 0.5) * cell;
    let far = 0;
    let farD = -1;
    for (let k = 0; k < SLOTS; k += 1) {
      const id = slots[base + k];
      const dx = x[id] - ccx;
      const dy = y[id] - ccy;
      const dist = dx * dx + dy * dy;
      if (dist > farD) {
        farD = dist;
        far = k;
      }
    }
    const dx = x[i] - ccx;
    const dy = y[i] - ccy;
    if (dx * dx + dy * dy < farD) slots[base + far] = i;
  }
}

export function buildSiteHash(
  count: number,
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  spacing: number,
) {
  const hash = createSiteHash(minX, minY, maxX, maxY, spacing);
  fillSiteHash(hash, count, x, y);
  return hash;
}

export function nearestSite(
  wx: number,
  wy: number,
  count: number,
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  weight: ArrayLike<number>,
  hash: SiteHash,
) {
  if (count < 1) return -1;
  const cx = Math.floor((wx - hash.originX) / hash.cell);
  const cy = Math.floor((wy - hash.originY) / hash.cell);
  let best = -1;
  let bestDist = Infinity;

  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const hx = cx + ox;
      const hy = cy + oy;
      if (hx < 0 || hy < 0 || hx >= hash.cols || hy >= hash.rows) continue;
      const base = (hy * hash.cols + hx) * SLOTS;
      for (let k = 0; k < SLOTS; k += 1) {
        const id = hash.slots[base + k];
        if (id < 0) continue;
        const dx = wx - x[id];
        const dy = wy - y[id];
        const dist = dx * dx + dy * dy - weight[id];
        if (dist < bestDist) {
          bestDist = dist;
          best = id;
        }
      }
    }
  }

  return best;
}

export function hashOccupancy(hash: SiteHash) {
  let max = 0;
  let used = 0;
  const cells = hash.cols * hash.rows;
  for (let i = 0; i < cells; i += 1) {
    let n = 0;
    for (let k = 0; k < SLOTS; k += 1) {
      if (hash.slots[i * SLOTS + k] >= 0) n += 1;
    }
    if (n > 0) used += 1;
    if (n > max) max = n;
  }
  return { max, used, cells };
}
