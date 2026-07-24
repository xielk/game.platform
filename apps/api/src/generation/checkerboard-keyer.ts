import sharp from 'sharp';

export type TransparencyStats = {
  width: number;
  height: number;
  channels: number;
  transparentSamples: number;
  edgeSamples: number;
  edgeOpaqueSamples: number;
  edgeGraySamples: number;
  edgeOpaqueRatio: number;
  edgeGrayRatio: number;
};

export type CheckerboardKeyResult = {
  buffer: Buffer;
  mimeType: 'image/png';
  attempted: boolean;
  applied: boolean;
  success: boolean;
  reason?: string;
  statsBefore?: TransparencyStats;
  statsAfter?: TransparencyStats;
};

const SAMPLE_STEP = 4;
const EDGE_OPAQUE_THRESHOLD = 8;

export function isKeyableBackgroundPixel(r: number, g: number, b: number) {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (chroma > 32) return false;
  const luminance = (r + g + b) / 3;
  return luminance >= 105;
}

export async function analyzeTransparency(buffer: Buffer): Promise<TransparencyStats> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let transparentSamples = 0;
  let edgeSamples = 0;
  let edgeOpaqueSamples = 0;
  let edgeGraySamples = 0;

  const alphaAt = (x: number, y: number) => data[(y * width + x) * channels + 3];
  const rgbAt = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (alphaAt(x, y) === 0) transparentSamples++;
    }
  }

  const edgeCoords: Array<[number, number]> = [];
  for (let x = 0; x < width; x += 2) {
    edgeCoords.push([x, 0], [x, 1], [x, height - 2], [x, height - 1]);
  }
  for (let y = 0; y < height; y += 2) {
    edgeCoords.push([0, y], [1, y], [width - 2, y], [width - 1, y]);
  }

  for (const [x, y] of edgeCoords) {
    edgeSamples++;
    const { r, g, b } = rgbAt(x, y);
    const alpha = alphaAt(x, y);
    if (alpha > EDGE_OPAQUE_THRESHOLD) edgeOpaqueSamples++;
    if (Math.abs(r - g) < 8 && Math.abs(g - b) < 8) edgeGraySamples++;
  }

  return {
    width,
    height,
    channels,
    transparentSamples,
    edgeSamples,
    edgeOpaqueSamples,
    edgeGraySamples,
    edgeOpaqueRatio: edgeSamples ? edgeOpaqueSamples / edgeSamples : 1,
    edgeGrayRatio: edgeSamples ? edgeGraySamples / edgeSamples : 0,
  };
}

export function shouldAttemptCheckerboardKeying(stats: TransparencyStats) {
  const alreadyTransparent = stats.transparentSamples > 500;
  if (alreadyTransparent) {
    return { shouldAttempt: false, reason: 'image already has true transparent pixels' };
  }

  const hasCheckerboardEdges = stats.edgeOpaqueRatio > 0.2 && stats.edgeGrayRatio > 0.55;
  if (!hasCheckerboardEdges) {
    return { shouldAttempt: false, reason: 'edge does not look like baked checkerboard background' };
  }

  return { shouldAttempt: true };
}

export function passesTransparencyValidation(stats: TransparencyStats) {
  return stats.transparentSamples > 500 && stats.edgeOpaqueRatio < 0.02;
}

function floodFillCheckerboard(data: Buffer, width: number, height: number, channels: number) {
  const total = width * height;
  const background = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const idx = (x: number, y: number) => y * width + x;
  const read = (x: number, y: number) => {
    const i = idx(x, y) * channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };
  const enqueue = (x: number, y: number) => {
    const id = idx(x, y);
    if (background[id]) return;
    const { r, g, b } = read(x, y);
    if (!isKeyableBackgroundPixel(r, g, b)) return;
    background[id] = 1;
    queue[tail++] = id;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const id = queue[head++];
    const x = id % width;
    const y = Math.floor(id / width);
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  for (let i = 0; i < total; i++) {
    const offset = i * channels;
    if (background[i]) {
      data[offset + 3] = 0;
    } else if (channels >= 4) {
      data[offset + 3] = 255;
    }
  }
}

export async function keyCheckerboardBackground(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodFillCheckerboard(data, info.width, info.height, info.channels);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

export async function applyCheckerboardKeyingIfNeeded(buffer: Buffer): Promise<CheckerboardKeyResult> {
  const statsBefore = await analyzeTransparency(buffer);
  const gate = shouldAttemptCheckerboardKeying(statsBefore);
  if (!gate.shouldAttempt) {
    return { buffer, mimeType: 'image/png', attempted: false, applied: false, success: false, reason: gate.reason, statsBefore };
  }

  const keyed = await keyCheckerboardBackground(buffer);
  const statsAfter = await analyzeTransparency(keyed);
  const success = passesTransparencyValidation(statsAfter);
  return {
    buffer: success ? keyed : buffer,
    mimeType: 'image/png',
    attempted: true,
    applied: success,
    success,
    reason: success ? undefined : 'checkerboard keying did not pass transparency validation',
    statsBefore,
    statsAfter,
  };
}
