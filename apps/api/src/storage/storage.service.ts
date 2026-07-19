import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile, access } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { StorageProvider, StoredObject } from './storage.provider';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly root = resolve(process.env.STORAGE_ROOT || './storage');
  async put(buffer: Buffer, originalName: string, mimeType: string, namespace = 'misc'): Promise<StoredObject> {
    const cleanExt = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
    const date = new Date().toISOString().slice(0, 10);
    const key = `${namespace}/${date}/${randomUUID()}${cleanExt}`;
    const full = this.safe(key);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, buffer);
    return { key, publicPath: `/api/files/content/${encodeURIComponent(key)}`, size: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), mimeType, originalName };
  }
  async read(key: string) { try { return await readFile(this.safe(key)); } catch { throw new NotFoundException('文件不存在'); } }
  async exists(key: string) { try { await access(this.safe(key)); return true; } catch { return false; } }
  async remove(key: string) { await unlink(this.safe(key)); }
  private safe(key: string) { const full = resolve(this.root, key); if (!full.startsWith(this.root + sep)) throw new NotFoundException(); return full; }
}
