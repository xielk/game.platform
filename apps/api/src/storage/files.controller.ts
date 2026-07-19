import { BadRequestException, Controller, Get, Header, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { AdminGuard } from '../shared/admin.guard';
import { StorageService } from './storage.service';
import { lookup } from 'mime-types';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService) {}

  @Post('upload') @ApiSecurity('admin') @UseGuards(AdminGuard) @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } })) @ApiConsumes('multipart/form-data')
  async upload(@UploadedFile() file: Express.Multer.File, @Query('assetId') assetId?: string, @Query('version') version?: string, @Query('purpose') purpose = 'source') {
    if (!file) throw new BadRequestException('请选择文件');
    let versionId: bigint | undefined;
    if (assetId) { const asset = await this.db.asset.findUniqueOrThrow({ where: { assetId } }); const target = version ? await this.db.assetVersion.findUniqueOrThrow({ where: { assetId_versionNumber: { assetId: asset.id, versionNumber: Number(version) } } }) : await this.db.assetVersion.findFirstOrThrow({ where: { assetId: asset.id }, orderBy: { versionNumber: 'desc' } }); versionId = target.id; }
    const stored = await this.storage.put(file.buffer, file.originalname, file.mimetype, assetId || 'references');
    return this.db.assetFile.create({ data: { versionId, purpose, provider: 'local', storageKey: stored.key, originalName: stored.originalName, mimeType: stored.mimeType, sizeBytes: BigInt(stored.size), sha256: stored.sha256, publicPath: stored.publicPath } });
  }

  @Get(':id/content')
  async byId(@Param('id') id: string, @Res() response: Response) { const file = await this.db.assetFile.findUniqueOrThrow({ where: { id: BigInt(id) } }); response.type(file.mimeType).setHeader('Cache-Control', 'public, max-age=31536000, immutable').send(await this.storage.read(file.storageKey)); }

  @Get('content/:key') @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async byKey(@Param('key') key: string, @Res() response: Response) { const decoded = decodeURIComponent(key); response.type(lookup(decoded) || 'application/octet-stream').send(await this.storage.read(decoded)); }
}
