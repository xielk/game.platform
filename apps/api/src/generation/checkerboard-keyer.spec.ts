import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  analyzeTransparency,
  applyCheckerboardKeyingIfNeeded,
  isKeyableBackgroundPixel,
  passesTransparencyValidation,
  shouldAttemptCheckerboardKeying,
} from './checkerboard-keyer';

async function makeCheckerboardWithSubject(width: number, height: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const checker = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) === 0;
      const tone = checker ? 220 : 180;
      raw[i] = tone;
      raw[i + 1] = tone;
      raw[i + 2] = tone;
      if (x > width * 0.35 && x < width * 0.65 && y > height * 0.35 && y < height * 0.65) {
        raw[i] = 40;
        raw[i + 1] = 80;
        raw[i + 2] = 160;
      }
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe('checkerboard-keyer', () => {
  it('detects keyable checkerboard background pixels', () => {
    expect(isKeyableBackgroundPixel(220, 220, 220)).toBe(true);
    expect(isKeyableBackgroundPixel(40, 80, 160)).toBe(false);
  });

  it('attempts keying only for opaque checkerboard edges', async () => {
    const synthetic = await makeCheckerboardWithSubject(256, 256);
    const stats = await analyzeTransparency(synthetic);
    expect(shouldAttemptCheckerboardKeying(stats).shouldAttempt).toBe(true);

    const result = await applyCheckerboardKeyingIfNeeded(synthetic);
    expect(result.attempted).toBe(true);
    expect(result.applied).toBe(true);
    expect(result.success).toBe(true);
    expect(passesTransparencyValidation(result.statsAfter!)).toBe(true);
  });

  it('keys the real medium werewolf sample when present', async () => {
    const samplePath = path.resolve(process.cwd(), '../../tmp-test-output/server-medium-latest.png');
    if (!fs.existsSync(samplePath)) return;

    const sample = fs.readFileSync(samplePath);
    const before = await analyzeTransparency(sample);
    expect(shouldAttemptCheckerboardKeying(before).shouldAttempt).toBe(true);

    const result = await applyCheckerboardKeyingIfNeeded(sample);
    expect(result.applied).toBe(true);
    expect(result.success).toBe(true);
  });
});
