import { ConflictException, Injectable } from '@nestjs/common';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ExportService {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService) {}

  async create(input: { scopeType: 'game' | 'level'; gameId: string; levelId?: string }) {
    const game = await this.db.game.findUniqueOrThrow({ where: { gameId: input.gameId } });
    const level = input.scopeType === 'level' ? await this.db.level.findUniqueOrThrow({ where: { levelId: input.levelId || '' } }) : null;
    const row = await this.db.exportTask.create({ data: { exportId: `export_${randomUUID().replace(/-/g, '')}`, scopeType: input.scopeType, gameId: game.id, levelId: level?.id, status: 'processing' } });
    try {
      const levelLinks = await this.db.levelAsset.findMany({ where: { level: { gameId: game.id, deletedAt: null, ...(level ? { id: level.id } : {}) } }, include: { level: true, asset: { include: { assetType: true } }, assetVersion: { include: { files: true } } } });
      const gameAssets = input.scopeType === 'game' ? await this.db.asset.findMany({ where: { gameId: game.id, deletedAt: null }, include: { assetType: true, versions: { where: { status: 'published' }, orderBy: { versionNumber: 'desc' }, take: 1, include: { files: true } } } }) : [];
      const selected = new Map<string, any>();
      for (const a of gameAssets) selected.set(a.assetId, { asset: a, version: a.versions[0] });
      for (const link of levelLinks) { const version = link.assetVersion || await this.db.assetVersion.findFirst({ where: { assetId: link.asset.id, status: 'published' }, orderBy: { versionNumber: 'desc' }, include: { files: true } }); selected.set(link.asset.assetId, { asset: link.asset, version }); }
      const missing = [...selected.values()].filter((x) => !x.version || !x.version.files?.length).map((x) => x.asset.assetId);
      if (missing.length) throw new ConflictException(`导出完整性检查失败，缺少已发布版本或文件：${missing.join(', ')}`);
      const ids = [...selected.values()].map((x) => x.asset.id);
      const relations = await this.db.assetRelation.findMany({ where: { sourceAssetId: { in: ids } }, include: { source: true, target: true } });
      const manifest = {
        schemaVersion: '1.0', gameId: game.gameId, gameVersion: 'current', exportedAt: new Date().toISOString(), scope: input.scopeType,
        levelId: level?.levelId || null,
        assets: [...selected.values()].map(({ asset, version }) => ({ assetId: asset.assetId, type: asset.assetType.typeId, version: `v${String(version.versionNumber).padStart(3, '0')}`, files: version.files.map((f: any) => ({ purpose: f.purpose, path: `assets/${asset.assetType.typeId}/${asset.assetId}/${f.originalName}`, sha256: f.sha256, mimeType: f.mimeType })) })),
        relations: relations.map((r) => ({ source: r.source.assetId, type: r.relationType, target: r.target.assetId })),
        levelAssets: levelLinks.map((l) => ({ levelId: l.level.levelId, assetId: l.asset.assetId, usage: l.usage, version: l.assetVersion ? `v${String(l.assetVersion.versionNumber).padStart(3, '0')}` : 'current_published' })),
      };
      const phaser = { schemaVersion: '1.0', assets: manifest.assets.flatMap((a) => a.files.map((f: any) => ({ key: `${a.assetId}_${f.purpose}`, type: f.mimeType.startsWith('audio/') ? 'audio' : f.mimeType === 'application/json' ? 'json' : 'image', url: f.path }))) };
      const zip = await this.zip(manifest, phaser, [...selected.values()]);
      const stored = await this.storage.put(zip, `${game.gameId}_${input.scopeType}.zip`, 'application/zip', 'exports');
      return this.db.exportTask.update({ where: { id: row.id }, data: { status: 'succeeded', storageKey: stored.key, sha256: createHash('sha256').update(zip).digest('hex'), integrityReport: { ok: true, assetCount: selected.size }, finishedAt: new Date() } });
    } catch (error: any) {
      await this.db.exportTask.update({ where: { id: row.id }, data: { status: 'failed', errorMessage: error.message, integrityReport: { ok: false, error: error.message }, finishedAt: new Date() } });
      throw error;
    }
  }

  private async zip(manifest: any, phaser: any, selected: any[]) {
    const output = new PassThrough(); const chunks: Buffer[] = [];
    output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const done = new Promise<Buffer>((resolve, reject) => { output.on('end', () => resolve(Buffer.concat(chunks))); output.on('error', reject); });
    const archive = archiver('zip', { zlib: { level: 9 } }); archive.on('error', (e) => output.destroy(e)); archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' }); archive.append(JSON.stringify({ gameId: manifest.gameId, version: manifest.gameVersion }, null, 2), { name: 'game.json' }); archive.append(JSON.stringify(phaser, null, 2), { name: 'phaser-loader.json' });
    for (const { asset, version } of selected) for (const file of version.files) archive.append(await this.storage.read(file.storageKey), { name: `assets/${asset.assetType.typeId}/${asset.assetId}/${file.originalName}` });
    await archive.finalize(); return done;
  }
}
