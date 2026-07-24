import sharp from 'sharp';

export type ImageSize = { width: number; height: number };

export function parseImageSize(size?: string): ImageSize | null {
  const match = /^(\d+)x(\d+)$/i.exec(String(size || '').trim());
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export async function normalizeImageBuffer(
  buffer: Buffer,
  targetSize?: string,
): Promise<{ buffer: Buffer; mimeType: string; adjusted: boolean; sourceSize?: ImageSize; targetSize?: ImageSize }> {
  const target = parseImageSize(targetSize);
  if (!target) return { buffer, mimeType: 'image/png', adjusted: false };

  const meta = await sharp(buffer).metadata();
  const sourceSize = { width: meta.width || 0, height: meta.height || 0 };
  if (sourceSize.width === target.width && sourceSize.height === target.height) {
    return { buffer, mimeType: 'image/png', adjusted: false, sourceSize, targetSize: target };
  }

  const normalized = await sharp(buffer)
    .resize(target.width, target.height, { fit: 'fill' })
    .png()
    .toBuffer();

  return { buffer: normalized, mimeType: 'image/png', adjusted: true, sourceSize, targetSize: target };
}
