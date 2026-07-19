import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { AdminGuard } from '../shared/admin.guard';
import { StorageService } from '../storage/storage.service';
import { ExportService } from './export.service';

class ExportDto { @IsIn(['game', 'level']) scopeType!: 'game' | 'level'; @IsString() gameId!: string; @IsOptional() @IsString() levelId?: string; }

@ApiTags('exports') @ApiSecurity('admin') @UseGuards(AdminGuard) @Controller('exports')
export class ExportController {
  constructor(private readonly service: ExportService, private readonly db: PrismaService, private readonly storage: StorageService) {}
  @Get() list() { return this.db.exportTask.findMany({ include: { game: true, level: true }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  @Post() create(@Body() dto: ExportDto) { return this.service.create(dto); }
  @Get(':exportId') get(@Param('exportId') exportId: string) { return this.db.exportTask.findUniqueOrThrow({ where: { exportId }, include: { game: true, level: true } }); }
  @Get(':exportId/download') async download(@Param('exportId') exportId: string, @Res() response: Response) { const row = await this.db.exportTask.findUniqueOrThrow({ where: { exportId } }); if (!row.storageKey) return response.status(409).json({ message: '导出尚未完成' }); response.type('application/zip').attachment(`${exportId}.zip`).send(await this.storage.read(row.storageKey)); }
}
