import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { AdminGuard } from '../shared/admin.guard';
import { stableId } from '../catalog/dtos';
import { GenerationService } from './generation.service';
import { StorageService } from '../storage/storage.service';

class DraftDto {
  @IsString() @Matches(stableId) gameId!: string; @IsOptional() @IsString() levelId?: string; @IsString() @Matches(stableId) typeId!: string;
  @IsString() name!: string; @IsString() description!: string; @IsOptional() @IsString() styleId?: string; @IsOptional() @IsString() targetSize?: string;
  @IsOptional() @IsBoolean() transparent?: boolean; @IsOptional() @IsString() animation?: string; @IsOptional() @IsInt() @Min(1) quantity?: number;
}

@ApiTags('generation') @ApiSecurity('admin') @UseGuards(AdminGuard) @Controller('generation')
export class GenerationController {
  constructor(private readonly service: GenerationService, private readonly db: PrismaService, private readonly storage: StorageService) {}
  @Get('tasks') list() { return this.db.generationTask.findMany({ include: { game: true, level: true, assetType: true, results: { include: { file: true, assetVersion: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  @Get('tasks/:taskId') get(@Param('taskId') taskId: string) { return this.db.generationTask.findUniqueOrThrow({ where: { taskId }, include: { results: { include: { file: true, assetVersion: true } }, styleProfile: true, game: true, level: true, assetType: true } }); }
  @Post('draft') draft(@Body() dto: DraftDto) { return this.service.draft(dto); }
  @Post('tasks/:taskId/confirm') confirm(@Param('taskId') taskId: string, @Body() body: { prompt?: string; negativePrompt?: string }) { return this.service.confirm(taskId, body); }
  @Post('tasks/:taskId/retry') retry(@Param('taskId') taskId: string) { return this.service.retry(taskId); }
  @Post('tasks/:taskId/cancel') cancel(@Param('taskId') taskId: string) { return this.service.cancel(taskId); }
  @Post('image2-hardcoded')
  async image2Hardcoded() {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    if (!apiKey) throw new HttpException('AI_API_KEY or OPENAI_API_KEY is required', HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = {
      model: 'gpt-image-2',
      prompt: '一匹完整的棕色马，侧面站立，纯白背景，写实风格，主体居中',
      size: '1024x1024',
      quality: 'low',
      output_format: 'png',
    };
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(Number(process.env.AI_IMAGE_TIMEOUT_MS || '300000')),
      });
    } catch (error: any) {
      const cause = error?.cause ? JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause)) : undefined;
      throw new HttpException({ message: String(error?.message || error), cause, url: `${baseUrl}/images/generations`, payload }, HttpStatus.BAD_GATEWAY);
    }
    if (!response.ok) {
      const body = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 2000);
      const requestId = response.headers.get('x-request-id') || response.headers.get('x-client-request-id') || 'unknown-request-id';
      throw new HttpException(`OpenAI image2 hardcoded returned HTTP ${response.status} [${requestId}] ${body}`, HttpStatus.BAD_GATEWAY);
    }
    const data: any = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new HttpException('OpenAI image2 hardcoded response missing data[0].b64_json', HttpStatus.BAD_GATEWAY);
    const stored = await this.storage.put(Buffer.from(b64, 'base64'), 'horse-1024.png', 'image/png', 'generation/image2-hardcoded');
    return { ok: true, baseUrl, model: 'gpt-image-2', prompt: '一匹完整的棕色马，侧面站立，纯白背景，写实风格，主体居中', ...stored };
  }
  @Post('results/:resultId/register')
  async register(@Param('resultId') resultId: string, @Body() body: { assetId: string; displayName: string; levelId?: string }) {
    const result = await this.db.generationResult.findUniqueOrThrow({ where: { resultId }, include: { task: { include: { assetType: true } }, file: true } });
    const existing = await this.db.asset.findUnique({ where: { assetId: body.assetId }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
    const asset = existing || await this.db.asset.create({ data: { assetId: body.assetId, gameId: result.task.gameId, assetTypeId: result.task.assetTypeId, displayName: body.displayName, status: 'draft' }, include: { versions: true } });
    const number = (existing?.versions[0]?.versionNumber || 0) + 1;
    const version = await this.db.assetVersion.create({ data: { assetId: asset.id, versionNumber: number, parentVersionId: existing?.versions[0]?.id, designSpec: result.task.designSpec || undefined, prompt: result.task.prompt, negativePrompt: result.task.negativePrompt, generationMetadata: { provider: result.task.provider, model: result.task.model, taskId: result.task.taskId }, styleProfileSnapshot: result.task.styleProfileId ? { styleProfileId: result.task.styleProfileId.toString() } : undefined } });
    if (result.fileId) await this.db.assetFile.update({ where: { id: result.fileId }, data: { versionId: version.id, purpose: 'source' } });
    await this.db.generationResult.update({ where: { id: result.id }, data: { selected: true, assetVersionId: version.id } });
    if (body.levelId) { const level = await this.db.level.findUniqueOrThrow({ where: { levelId: body.levelId } }); await this.db.levelAsset.upsert({ where: { levelId_assetId_usage: { levelId: level.id, assetId: asset.id, usage: 'default' } }, update: { assetVersionId: version.id }, create: { levelId: level.id, assetId: asset.id, assetVersionId: version.id, usage: 'default' } }); }
    return { asset, version };
  }
}
