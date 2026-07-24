import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { AIProvider, DesignInput, MockAIProvider, OpenAICompatibleProvider } from './ai.provider';
import { normalizeImageBuffer } from './image-normalizer';
import { applyCheckerboardKeyingIfNeeded } from './checkerboard-keyer';

type RuntimeLogLevel = 'info' | 'warn' | 'error';
type RuntimeLogEntry = { ts: string; level: RuntimeLogLevel; message: string; data?: Record<string, unknown> };

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  constructor(private readonly db: PrismaService, private readonly storage: StorageService) {}
  private provider(): AIProvider { return process.env.AI_PROVIDER === 'openai-compatible' ? new OpenAICompatibleProvider() : new MockAIProvider(); }
  private now() { return new Date().toISOString(); }
  private isGptImageModel(model: string) { return /^gpt-image/i.test(model); }
  private isNpcSpriteSheet(input: { typeId?: string }) { return input.typeId === 'npc'; }
  private sanitizeNpcArtStyle(value?: string) {
    const fallback = '2D top-down tower defense game sprite, crisp silhouette, readable chibi proportions, neon cyan accents on the character only';
    return (value || fallback)
      .replace(/暗色底|深色底|黑色底|暗背景|深色背景|黑色背景|背景为暗色|背景为深色|dark background|black background|solid background|gradient background/gi, '深色服装和霓虹高光')
      .replace(/透明背景要求|透明背景|背景/gi, '')
      .replace(/不是\s*$/g, '')
      .replace(/[，,、]\s*[，,、]+/g, '，')
      .trim();
  }
  private normalizeImageSize(model: string, size?: string) {
    const requested = size || '1024x1024';
    if (this.isGptImageModel(model) && requested === '512x512') return '1024x1024';
    return requested;
  }
  private normalizePromptForModel(model: string, prompt: string, options: Record<string, unknown>) {
    if (options.requiresTransparentAlpha) return prompt;
    if (!this.isGptImageModel(model)) return prompt;
    return prompt
      .replace(/transparent background/gi, '')
      .replace(/背景透明/g, '纯白背景')
      .replace(/\s*,\s*,/g, ',')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
      .replace(/^,|,$/g, '');
  }
  private normalizeModelParamsForRun(model: string, params: Record<string, unknown>) {
    const normalized: Record<string, unknown> = {
      ...params,
      quantity: params.quantity || 1,
      size: this.normalizeImageSize(model, String(params.size || '1024x1024')),
      outputFormat: params.outputFormat || 'png',
      quality: params.quality || process.env.AI_IMAGE_QUALITY || 'low',
    };
    if (this.isGptImageModel(model) && !normalized.requiresTransparentAlpha) delete normalized.background;
    return normalized;
  }
  private providerPayloadPreview(model: string, prompt: string, options: Record<string, unknown>) {
    const payload: Record<string, unknown> = { model, prompt, size: options.size || '1024x1024' };
    if (Number(options.quantity || 1) > 1) payload.n = options.quantity;
    if (options.background && (process.env.AI_IMAGE_USE_BACKGROUND_PARAM === 'true' || options.requiresTransparentAlpha)) payload.background = options.background;
    if (options.outputFormat) payload.output_format = options.outputFormat;
    if (options.quality) payload.quality = options.quality;
    if (!this.isGptImageModel(model)) payload.response_format = 'b64_json';
    return payload;
  }
  private async appendLog(taskId: string, level: RuntimeLogLevel, message: string, data?: Record<string, unknown>) {
    const current = await this.db.generationTask.findUniqueOrThrow({ where: { taskId }, select: { runtimeLogs: true } });
    const logs = Array.isArray(current.runtimeLogs) ? [...(current.runtimeLogs as RuntimeLogEntry[])] : [];
    const entry: RuntimeLogEntry = { ts: this.now(), level, message, ...(data && Object.keys(data).length ? { data } : {}) };
    logs.push(entry);
    await this.db.generationTask.update({ where: { taskId }, data: { runtimeLogs: logs.slice(-80) as Prisma.InputJsonValue } });
    const suffix = data ? ` ${JSON.stringify(data)}` : '';
    const text = `[${taskId}] ${message}${suffix}`;
    if (level === 'error') this.logger.error(text);
    else if (level === 'warn') this.logger.warn(text);
    else this.logger.log(text);
  }

  async draft(input: DesignInput & { gameId: string; levelId?: string; styleId?: string }) {
    const [game, type, level, style] = await Promise.all([
      this.db.game.findUniqueOrThrow({ where: { gameId: input.gameId } }), this.db.assetType.findUniqueOrThrow({ where: { typeId: input.typeId } }),
      input.levelId ? this.db.level.findUniqueOrThrow({ where: { levelId: input.levelId } }) : null,
      input.styleId ? this.db.styleProfile.findUniqueOrThrow({ where: { styleId: input.styleId } }) : this.db.styleProfile.findFirst({ where: { game: { gameId: input.gameId }, isActive: true, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const styleSnapshot = style ? JSON.parse(JSON.stringify(style, (_k, v) => typeof v === 'bigint' ? v.toString() : v)) : {};
    const providerName = process.env.AI_PROVIDER || 'mock';
    const modelName = process.env.AI_IMAGE_MODEL || 'mock-image';
    const isNpcSpriteSheet = this.isNpcSpriteSheet(input);
    this.logger.log(`Drafting generation spec for ${input.gameId}/${input.typeId} with provider=${providerName}, model=${modelName}`);
    const normalizedInput = {
      ...input,
      name: input.characterName || input.name,
      description: input.characterDescription || input.description,
      targetSize: isNpcSpriteSheet ? '1024x1024' : this.normalizeImageSize(modelName, input.targetSize || (styleSnapshot as any).frameCanvasSize),
      sheetSize: isNpcSpriteSheet ? '1024x1024' : input.sheetSize,
      frameSize: isNpcSpriteSheet ? '256x256' : input.frameSize,
      animationFrameConfig: isNpcSpriteSheet ? 'idle:0-3@6 loop; walk:4-7@8 loop; attack:8-11@10 once; die:12-15@7 once' : input.animationFrameConfig,
      artStyle: isNpcSpriteSheet ? this.sanitizeNpcArtStyle(input.artStyle || (styleSnapshot as any).artStyle) : input.artStyle,
      transparent: isNpcSpriteSheet ? true : (this.isGptImageModel(modelName) ? false : (input.transparent ?? true)),
      removeShadow: isNpcSpriteSheet ? true : input.removeShadow,
    };
    const spec = await this.provider().generateDesignSpec(normalizedInput, styleSnapshot);
    const prompts = await this.provider().generatePrompt(spec, styleSnapshot);
    const modelParams: Record<string, unknown> = {
      quantity: isNpcSpriteSheet ? 1 : (input.quantity || 1),
      size: normalizedInput.targetSize,
      outputFormat: 'png',
      quality: process.env.AI_IMAGE_QUALITY || 'low',
    };
    if (isNpcSpriteSheet) Object.assign(modelParams, {
      background: 'transparent',
      requiresTransparentAlpha: true,
      spriteSheet: 'npc',
      frameWidth: 256,
      frameHeight: 256,
      columns: 4,
      rows: 4,
      totalFrames: 16,
      exportImage: 'npc_sprite_sheet.png',
      exportJson: 'npc_sprite_sheet.json',
      animations: {
        idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
        walk: { start: 4, end: 7, frameRate: 8, repeat: -1 },
        attack: { start: 8, end: 11, frameRate: 10, repeat: 0 },
        die: { start: 12, end: 15, frameRate: 7, repeat: 0 },
      },
    });
    else if (!this.isGptImageModel(modelName)) modelParams.background = normalizedInput.transparent === false ? 'opaque' : 'transparent';
    const task = await this.db.generationTask.create({ data: { taskId: `gen_${randomUUID().replace(/-/g, '')}`, gameId: game.id, levelId: level?.id, assetTypeId: type.id, styleProfileId: style?.id, status: 'draft', provider: providerName, model: modelName, input: input as any, designSpec: spec as any, prompt: prompts.prompt, negativePrompt: prompts.negativePrompt, modelParams: modelParams as Prisma.InputJsonValue, runtimeLogs: [{ ts: this.now(), level: 'info', message: 'Design Spec 已生成', data: { provider: providerName, model: modelName, assetType: input.typeId, size: modelParams.size, transparent: normalizedInput.transparent } }] as Prisma.InputJsonValue } });
    return task;
  }

  async confirm(taskId: string, patch?: { prompt?: string; negativePrompt?: string }) {
    const task = await this.db.generationTask.update({ where: { taskId }, data: { ...patch, status: 'queued', errorMessage: null } });
    await this.appendLog(taskId, 'info', '任务已进入队列', { status: 'queued' });
    setImmediate(() => void this.run(taskId));
    return task;
  }
  async continueTask(taskId: string) {
    const source = await this.db.generationTask.findUniqueOrThrow({ where: { taskId } });
    const next = await this.db.generationTask.create({
      data: {
        taskId: `gen_${randomUUID().replace(/-/g, '')}`,
        gameId: source.gameId,
        levelId: source.levelId,
        assetTypeId: source.assetTypeId,
        assetId: source.assetId,
        styleProfileId: source.styleProfileId,
        status: 'queued',
        provider: source.provider,
        model: source.model,
        input: source.input as Prisma.InputJsonValue,
        designSpec: source.designSpec as Prisma.InputJsonValue,
        prompt: source.prompt,
        negativePrompt: source.negativePrompt,
        modelParams: source.modelParams as Prisma.InputJsonValue,
        referenceFileIds: source.referenceFileIds as Prisma.InputJsonValue,
        runtimeLogs: [{ ts: this.now(), level: 'info', message: '继续生成：沿用原任务全部输入、规格和 Prompt', data: { sourceTaskId: taskId } }] as Prisma.InputJsonValue,
      },
    });
    setImmediate(() => void this.run(next.taskId));
    return next;
  }
  async regenerate(taskId: string, patch?: { prompt?: string; negativePrompt?: string }) {
    const task = await this.db.generationTask.findUniqueOrThrow({ where: { taskId }, include: { results: { include: { file: true } }, styleProfile: true } });
    const params = (task.modelParams || {}) as Record<string, unknown>;
    let nextPatch = patch;
    const promptWasNotEdited = patch?.prompt === undefined || patch.prompt === task.prompt;
    if (params.spriteSheet === 'npc' && promptWasNotEdited) {
      const styleSnapshot = task.styleProfile ? JSON.parse(JSON.stringify(task.styleProfile, (_key, value) => typeof value === 'bigint' ? value.toString() : value)) : {};
      const refreshed = await this.provider().generatePrompt((task.designSpec || {}) as Record<string, unknown>, styleSnapshot);
      const negativePromptWasNotEdited = patch?.negativePrompt === undefined || patch.negativePrompt === task.negativePrompt;
      nextPatch = {
        ...patch,
        prompt: refreshed.prompt,
        negativePrompt: negativePromptWasNotEdited ? refreshed.negativePrompt : patch?.negativePrompt,
      };
    }
    for (const result of task.results) {
      if (result.assetVersionId) continue;
      await this.db.generationResult.delete({ where: { id: result.id } });
      if (result.file) {
        await this.db.assetFile.delete({ where: { id: result.file.id } }).catch(() => undefined);
        await this.storage.remove(result.file.storageKey).catch(() => undefined);
      }
    }
    await this.db.generationTask.update({ where: { taskId }, data: { ...nextPatch, status: 'queued', errorMessage: null, startedAt: null, finishedAt: null } });
    await this.appendLog(taskId, 'warn', '重新生成：已清空未登记候选结果，并使用当前 Prompt 覆盖生成', { quality: String(params.quality || process.env.AI_IMAGE_QUALITY || 'low'), promptRefreshed: params.spriteSheet === 'npc' && promptWasNotEdited });
    setImmediate(() => void this.run(taskId));
    return this.db.generationTask.findUniqueOrThrow({ where: { taskId } });
  }
  async retry(taskId: string) { return this.confirm(taskId); }
  async cancel(taskId: string) {
    await this.appendLog(taskId, 'warn', '任务被手动取消');
    return this.db.generationTask.update({ where: { taskId }, data: { status: 'cancelled', finishedAt: new Date() } });
  }
  async run(taskId: string) {
    try {
      const task = await this.db.generationTask.update({ where: { taskId }, data: { status: 'processing', startedAt: new Date(), attemptCount: { increment: 1 } } });
      const options = this.normalizeModelParamsForRun(task.model || process.env.AI_IMAGE_MODEL || 'mock-image', (task.modelParams || {}) as Record<string, unknown>);
      const prompt = this.normalizePromptForModel(task.model || process.env.AI_IMAGE_MODEL || 'mock-image', task.prompt || '', options);
      const negativePrompt = String(task.negativePrompt || '').trim();
      const generationPrompt = negativePrompt ? `${prompt}\n\nAvoid these failure modes: ${negativePrompt}.` : prompt;
      const requestUrl = `${(process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/images/generations`;
      await this.appendLog(taskId, 'info', '开始调用 AI 生成', { provider: task.provider, model: task.model, requestUrl, payload: this.providerPayloadPreview(task.model || '', generationPrompt, options) });
      const results = await this.provider().generateImage(generationPrompt, options);
      await this.appendLog(taskId, 'info', 'AI 返回结果', { count: results.length });
      for (const result of results) {
        const normalized = await normalizeImageBuffer(result.buffer, String(options.size || '1024x1024'));
        if (normalized.adjusted) {
          await this.appendLog(taskId, 'warn', 'AI 返回尺寸与请求不一致，已自动缩放到目标尺寸', {
            requestedSize: options.size,
            sourceSize: normalized.sourceSize,
            targetSize: normalized.targetSize,
          });
        }
        let outputBuffer = normalized.buffer;
        let outputMime = normalized.mimeType;
        if (options.requiresTransparentAlpha) {
          const keyed = await applyCheckerboardKeyingIfNeeded(outputBuffer);
          if (keyed.attempted && keyed.applied) {
            outputBuffer = keyed.buffer;
            outputMime = keyed.mimeType;
            await this.appendLog(taskId, 'info', '检测到 RGB 棋盘格背景，已自动抠为透明 PNG', {
              transparentSamples: keyed.statsAfter?.transparentSamples,
              edgeOpaqueRatio: keyed.statsAfter?.edgeOpaqueRatio,
            });
          } else if (keyed.attempted && !keyed.success) {
            await this.appendLog(taskId, 'warn', '检测到 RGB 棋盘格背景，但自动抠透明未通过校验，请重新生成', {
              reason: keyed.reason,
              edgeGrayRatio: keyed.statsBefore?.edgeGrayRatio,
              transparentSamplesAfter: keyed.statsAfter?.transparentSamples,
              edgeOpaqueRatioAfter: keyed.statsAfter?.edgeOpaqueRatio,
            });
          }
        }
        const stored = await this.storage.put(outputBuffer, `${task.taskId}.png`, outputMime, `generation/${task.taskId}`);
        const file = await this.db.assetFile.create({ data: { purpose: 'generated', provider: 'local', storageKey: stored.key, originalName: stored.originalName, mimeType: stored.mimeType, sizeBytes: BigInt(stored.size), sha256: stored.sha256, publicPath: stored.publicPath } });
        await this.db.generationResult.create({ data: { resultId: `result_${randomUUID().replace(/-/g, '')}`, taskId: task.id, fileId: file.id, providerResultId: result.providerResultId, seed: result.seed, metadata: result.metadata as any } });
        await this.appendLog(taskId, 'info', '已保存结果文件', { publicPath: stored.publicPath, mimeType: stored.mimeType, size: stored.size });
      }
      await this.db.generationTask.update({ where: { taskId }, data: { status: 'succeeded', finishedAt: new Date() } });
      await this.appendLog(taskId, 'info', '任务成功完成', { resultCount: results.length });
    } catch (error: any) {
      const message = String(error?.message || error).replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 2000);
      await this.db.generationTask.update({ where: { taskId }, data: { status: 'failed', errorMessage: message, finishedAt: new Date() } });
      await this.appendLog(taskId, 'error', '任务失败', { message });
    }
  }
}
