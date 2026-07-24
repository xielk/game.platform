import sharp from 'sharp';
import { normalizeImageBuffer, parseImageSize } from './image-normalizer';

describe('image-normalizer', () => {
  it('parses WxH size strings', () => {
    expect(parseImageSize('1024x1024')).toEqual({ width: 1024, height: 1024 });
    expect(parseImageSize('bad')).toBeNull();
  });

  it('leaves buffers unchanged when dimensions already match', async () => {
    const source = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const result = await normalizeImageBuffer(source, '1024x1024');
    expect(result.adjusted).toBe(false);
    expect(result.buffer).toBe(source);
  });

  it('resizes mismatched buffers to the requested size', async () => {
    const source = await sharp({ create: { width: 1254, height: 1254, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const result = await normalizeImageBuffer(source, '1024x1024');
    expect(result.adjusted).toBe(true);
    expect(result.sourceSize).toEqual({ width: 1254, height: 1254 });
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(1024);
  });
});
