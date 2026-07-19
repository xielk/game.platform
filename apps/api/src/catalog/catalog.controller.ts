import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { AdminGuard } from '../shared/admin.guard';
import { AssetDto, AssetTypeDto, AssetVersionDto, GameDto, LevelAssetDto, LevelDto, RelationDto, StyleDto } from './dtos';

@ApiTags('catalog') @ApiSecurity('admin') @UseGuards(AdminGuard)
@Controller()
export class CatalogController {
  constructor(private readonly db: PrismaService) {}
  private bigint(id: string) { if (!/^\d+$/.test(id)) throw new NotFoundException(); return BigInt(id); }

  @Get('dashboard')
  async dashboard() {
    const [games, levels, assets, tasks, published, recent] = await Promise.all([
      this.db.game.count({ where: { deletedAt: null } }), this.db.level.count({ where: { deletedAt: null } }),
      this.db.asset.count({ where: { deletedAt: null } }), this.db.generationTask.count(),
      this.db.asset.count({ where: { status: 'published', deletedAt: null } }),
      this.db.asset.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 6, include: { game: true, assetType: true, versions: { orderBy: { versionNumber: 'desc' }, take: 1, include: { files: true } } } }),
    ]);
    return { counts: { games, levels, assets, tasks, published }, recent };
  }

  @Get('games') listGames() { return this.db.game.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { levels: true, assets: true } } } }); }
  @Post('games') createGame(@Body() dto: GameDto) { return this.db.game.create({ data: dto }); }
  @Put('games/:id') updateGame(@Param('id') id: string, @Body() dto: Partial<GameDto>) { const { gameId, ...data } = dto; return this.db.game.update({ where: { id: this.bigint(id) }, data }); }
  @Delete('games/:id') deleteGame(@Param('id') id: string) { return this.db.game.update({ where: { id: this.bigint(id) }, data: { deletedAt: new Date(), status: 'archived' } }); }

  @Get('levels') listLevels(@Query('gameId') gameId?: string) { return this.db.level.findMany({ where: { deletedAt: null, ...(gameId ? { game: { gameId } } : {}) }, include: { game: true, _count: { select: { assets: true } } }, orderBy: [{ gameId: 'asc' }, { sortOrder: 'asc' }] }); }
  @Post('levels') async createLevel(@Body() dto: LevelDto) { const game = await this.db.game.findUniqueOrThrow({ where: { gameId: dto.gameId } }); const { gameId, ...data } = dto; return this.db.level.create({ data: { ...data, gameId: game.id } as any }); }
  @Put('levels/:id') updateLevel(@Param('id') id: string, @Body() dto: Partial<LevelDto>) { const { gameId, ...data } = dto; return this.db.level.update({ where: { id: this.bigint(id) }, data: data as any }); }
  @Delete('levels/:id') deleteLevel(@Param('id') id: string) { return this.db.level.update({ where: { id: this.bigint(id) }, data: { deletedAt: new Date(), status: 'archived' } }); }

  @Get('asset-types') listTypes() { return this.db.assetType.findMany({ where: { deletedAt: null }, orderBy: [{ category: 'asc' }, { typeId: 'asc' }] }); }
  @Post('asset-types') createType(@Body() dto: AssetTypeDto) { return this.db.assetType.create({ data: dto }); }
  @Put('asset-types/:id') updateType(@Param('id') id: string, @Body() dto: Partial<AssetTypeDto>) { const { typeId, ...data } = dto; return this.db.assetType.update({ where: { id: this.bigint(id) }, data }); }
  @Delete('asset-types/:id') deleteType(@Param('id') id: string) { return this.db.assetType.update({ where: { id: this.bigint(id) }, data: { deletedAt: new Date(), isEnabled: false } }); }

  @Get('styles') listStyles(@Query('gameId') gameId?: string) { return this.db.styleProfile.findMany({ where: { deletedAt: null, ...(gameId ? { game: { gameId } } : {}) }, include: { game: true }, orderBy: { updatedAt: 'desc' } }); }
  @Post('styles') async createStyle(@Body() dto: StyleDto) { const game = await this.db.game.findUniqueOrThrow({ where: { gameId: dto.gameId } }); const { gameId, ...data } = dto; return this.db.styleProfile.create({ data: { ...data, gameId: game.id } }); }
  @Put('styles/:id') updateStyle(@Param('id') id: string, @Body() dto: Partial<StyleDto>) { const { gameId, styleId, ...data } = dto; return this.db.styleProfile.update({ where: { id: this.bigint(id) }, data: { ...data, version: { increment: 1 } } }); }
  @Delete('styles/:id') deleteStyle(@Param('id') id: string) { return this.db.styleProfile.update({ where: { id: this.bigint(id) }, data: { deletedAt: new Date(), isActive: false } }); }

  @Get('assets') listAssets(@Query() q: any) {
    return this.db.asset.findMany({ where: { deletedAt: null, ...(q.gameId ? { game: { gameId: q.gameId } } : {}), ...(q.typeId ? { assetType: { typeId: q.typeId } } : {}), ...(q.status ? { status: q.status } : {}), ...(q.search ? { OR: [{ assetId: { contains: q.search } }, { displayName: { contains: q.search } }] } : {}) }, include: { game: true, assetType: true, versions: { orderBy: { versionNumber: 'desc' }, take: 1, include: { files: true } }, levelLinks: { include: { level: true } }, _count: { select: { incoming: true, outgoing: true } } }, orderBy: { updatedAt: 'desc' } });
  }
  @Get('assets/:assetId') async getAsset(@Param('assetId') assetId: string) { const asset = await this.db.asset.findUnique({ where: { assetId }, include: { game: true, assetType: true, versions: { orderBy: { versionNumber: 'desc' }, include: { files: true, generationResults: true } }, levelLinks: { include: { level: true, assetVersion: true } }, outgoing: { include: { target: true } }, incoming: { include: { source: true } }, generationTasks: { orderBy: { createdAt: 'desc' } } } }); if (!asset) throw new NotFoundException('素材不存在'); return asset; }
  @Post('assets') async createAsset(@Body() dto: AssetDto) { const [game, type] = await Promise.all([this.db.game.findUniqueOrThrow({ where: { gameId: dto.gameId } }), this.db.assetType.findUniqueOrThrow({ where: { typeId: dto.typeId } })]); const { gameId, typeId, ...data } = dto; return this.db.asset.create({ data: { ...data, gameId: game.id, assetTypeId: type.id, versions: { create: { versionNumber: 1, status: 'draft' } } }, include: { versions: true } }); }
  @Put('assets/:assetId') updateAsset(@Param('assetId') assetId: string, @Body() dto: Partial<AssetDto>) { const { assetId: _assetId, gameId, typeId, ...data } = dto; return this.db.asset.update({ where: { assetId }, data }); }
  @Delete('assets/:assetId') async deleteAsset(@Param('assetId') assetId: string) { const asset = await this.db.asset.findUniqueOrThrow({ where: { assetId }, include: { _count: { select: { incoming: true, levelLinks: true } } } }); if (asset._count.incoming || asset._count.levelLinks) throw new ConflictException('素材仍被关系或关卡引用，请先解除依赖'); return this.db.asset.update({ where: { assetId }, data: { deletedAt: new Date(), status: 'deprecated' } }); }
  @Post('assets/:assetId/versions') async createVersion(@Param('assetId') assetId: string, @Body() dto: AssetVersionDto) { const asset = await this.db.asset.findUniqueOrThrow({ where: { assetId }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } }); const latest = asset.versions[0]?.versionNumber || 0; let parentVersionId: bigint | undefined; if (dto.parentVersionNumber) parentVersionId = (await this.db.assetVersion.findUniqueOrThrow({ where: { assetId_versionNumber: { assetId: asset.id, versionNumber: dto.parentVersionNumber } } })).id; const { parentVersionNumber, ...data } = dto; return this.db.assetVersion.create({ data: { ...data, assetId: asset.id, versionNumber: latest + 1, parentVersionId, status: 'draft' } as any }); }
  @Post('assets/:assetId/versions/:version/publish') async publishVersion(@Param('assetId') assetId: string, @Param('version') version: string) { const asset = await this.db.asset.findUniqueOrThrow({ where: { assetId } }); const versionRow = await this.db.assetVersion.findUniqueOrThrow({ where: { assetId_versionNumber: { assetId: asset.id, versionNumber: Number(version) } }, include: { files: true } }); if (!versionRow.files.length) throw new ConflictException('发布前至少需要一个文件'); return this.db.$transaction([this.db.assetVersion.update({ where: { id: versionRow.id }, data: { status: 'published', publishedAt: new Date() } }), this.db.asset.update({ where: { id: asset.id }, data: { status: 'published', currentVersionId: versionRow.id } })]); }

  @Get('relations') listRelations(@Query('assetId') assetId?: string) { return this.db.assetRelation.findMany({ where: assetId ? { OR: [{ source: { assetId } }, { target: { assetId } }] } : {}, include: { source: true, target: true }, orderBy: [{ relationType: 'asc' }, { sortOrder: 'asc' }] }); }
  @Post('relations') async createRelation(@Body() dto: RelationDto) { if (dto.sourceAssetId === dto.targetAssetId) throw new ConflictException('素材不能引用自身'); const [source, target] = await Promise.all([this.db.asset.findUniqueOrThrow({ where: { assetId: dto.sourceAssetId } }), this.db.asset.findUniqueOrThrow({ where: { assetId: dto.targetAssetId } })]); return this.db.assetRelation.create({ data: { sourceAssetId: source.id, targetAssetId: target.id, relationType: dto.relationType, sortOrder: dto.sortOrder || 0 }, include: { source: true, target: true } }); }
  @Delete('relations/:id') deleteRelation(@Param('id') id: string) { return this.db.assetRelation.delete({ where: { id: this.bigint(id) } }); }

  @Post('level-assets') async bindLevel(@Body() dto: LevelAssetDto) { const [level, asset] = await Promise.all([this.db.level.findUniqueOrThrow({ where: { levelId: dto.levelId } }), this.db.asset.findUniqueOrThrow({ where: { assetId: dto.assetId } })]); const version = dto.versionNumber ? await this.db.assetVersion.findUniqueOrThrow({ where: { assetId_versionNumber: { assetId: asset.id, versionNumber: dto.versionNumber } } }) : null; return this.db.levelAsset.create({ data: { levelId: level.id, assetId: asset.id, assetVersionId: version?.id, usage: dto.usage || 'default', config: dto.config } as any }); }
  @Delete('level-assets/:id') deleteLevelAsset(@Param('id') id: string) { return this.db.levelAsset.delete({ where: { id: this.bigint(id) } }); }

  @Get('maps') listMaps() { return this.db.map.findMany({ where: { deletedAt: null }, include: { game: true, level: true, versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } }); }
}
