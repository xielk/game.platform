export interface DesignInput {
  name: string;
  description: string;
  typeId: string;
  targetSize?: string;
  transparent?: boolean;
  animation?: string;
  quantity?: number;
  characterName?: string;
  characterDescription?: string;
  weaponType?: string;
  artStyle?: string;
  facing?: string;
  sheetSize?: string;
  frameSize?: string;
  animationFrameConfig?: string;
  removeShadow?: boolean;
}
export interface ImageResult { buffer: Buffer; mimeType: string; providerResultId?: string; seed?: string; metadata?: Record<string, unknown>; }
type ImageGenerationOptions = Record<string, unknown> & {
  quantity?: number;
  size?: string;
  background?: 'transparent' | 'opaque' | 'auto';
  outputFormat?: 'png' | 'webp' | 'jpeg';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  requiresTransparentAlpha?: boolean;
};
export interface AIProvider {
  generateDesignSpec(input: DesignInput, style: Record<string, unknown>): Promise<Record<string, unknown>>;
  generatePrompt(spec: Record<string, unknown>, style: Record<string, unknown>): Promise<{ prompt: string; negativePrompt: string }>;
  generateImage(prompt: string, options: ImageGenerationOptions): Promise<ImageResult[]>;
  editImage?(prompt: string, references: Buffer[], options: Record<string, unknown>): Promise<ImageResult[]>;
  getTaskStatus?(id: string): Promise<string>;
  cancelTask?(id: string): Promise<void>;
}

export class MockAIProvider implements AIProvider {
  async generateDesignSpec(input: DesignInput, style: Record<string, unknown>) {
    if (input.typeId === 'npc') {
      return {
        assetKind: 'npc_sprite_sheet',
        subject: input.characterName || input.name,
        assetType: input.typeId,
        character: {
          name: input.characterName || input.name,
          description: input.characterDescription || input.description,
          weaponType: input.weaponType || 'single readable weapon',
          artStyle: input.artStyle || style.artStyle || 'production-ready 2D tower defense game art',
          facing: input.facing || 'right',
        },
        output: {
          imageFormat: 'png',
          background: 'true transparent alpha',
          canvas: input.sheetSize || '1024x1024',
          frameSize: input.frameSize || '256x256',
          columns: 4,
          rows: 4,
          totalFrames: 16,
        },
        animationLayout: {
          idle: { frames: '1-4', description: 'subtle breathing and body sway', frameRate: 6, repeat: -1 },
          walk: { frames: '5-8', description: 'complete walking loop', frameRate: 8, repeat: -1 },
          attack: { frames: '9-12', description: 'raise weapon, strike, hit, recover', frameRate: 10, repeat: 0 },
          die: { frames: '13-16', description: 'hit reaction, lose balance, fall down, hold defeated pose', frameRate: 7, repeat: 0 },
        },
        consistency: {
          cameraAngle: 'fixed 45-degree top-down game perspective',
          facing: input.facing || 'right',
          lighting: style.lightingDirection || 'identical lighting direction in all frames',
          scale: 'identical character scale in all frames',
          feetBaseline: 'feet aligned to the same baseline in every frame',
          centered: 'horizontally centered in every 256x256 cell',
          noShadow: input.removeShadow ?? true,
        },
        forbidden: ['checkerboard background', 'ground shadow', 'text', 'numbers', 'labels', 'watermark', 'borders', 'grid lines', 'UI elements', 'frame clipping', 'frame overlap'],
        exportFiles: {
          image: 'npc_sprite_sheet.png',
          json: 'npc_sprite_sheet.json',
        },
      };
    }
    return { subject: input.name, assetType: input.typeId, visualDescription: input.description, canvas: input.targetSize || style.frameCanvasSize || '1024x1024', transparentBackground: input.transparent ?? true, animation: input.animation || null, consistency: { cameraAngle: style.cameraAngle, artStyle: style.artStyle, palette: style.colorPalette } };
  }
  async generatePrompt(spec: Record<string, any>, style: Record<string, any>) {
    if (spec.assetKind === 'npc_sprite_sheet') {
      const character = spec.character || {};
      return {
        prompt: [
          'Create a production-ready 2D tower defense NPC sprite sheet.',
          '',
          'Canvas size: 1024x1024 pixels.',
          'Layout: exactly 4 columns and 4 rows.',
          'Frame size: exactly 256x256 pixels.',
          'Total: exactly 16 animation frames.',
          '',
          'Animation layout:',
          'Frames 1-4: idle animation.',
          'Frames 5-8: walking animation.',
          'Frames 9-12: attack animation.',
          'Frames 13-16: death animation.',
          '',
          `Character name: ${character.name || spec.subject}.`,
          `Character description: ${character.description || 'NPC game character'}.`,
          `Weapon type: ${character.weaponType || 'single readable weapon'}.`,
          `Art style: ${character.artStyle || style.artStyle || 'production-ready 2D tower defense game art'}.`,
          '',
          'Use the exact same character design, face, body proportions, clothing, colors and weapon in every frame.',
          '',
          `Fixed 45-degree top-down game perspective, facing ${character.facing || 'right'}.`,
          'Keep the character centered in every frame.',
          'Keep the feet aligned to the same baseline.',
          'Keep identical camera angle, scale and lighting.',
          '',
          'True transparent PNG background with alpha channel.',
          'No checkerboard background.',
          'No ground.',
          'No shadow.',
          'No text.',
          'No numbers.',
          'No labels.',
          'No watermark.',
          'No borders.',
          'No grid lines.',
          'No UI elements.',
          '',
          'Make every animation frame cleanly separated inside its 256x256 cell, with no clipping or overlap.',
        ].join('\n'),
        negativePrompt: style.negativePrompt || 'text, numbers, labels, watermark, borders, grid lines, checkerboard background, fake transparency, opaque background, ground, ground shadow, UI elements, inconsistent face, inconsistent clothes, inconsistent colors, inconsistent weapon, inconsistent scale, camera angle changes, lighting changes, clipping, overlap',
      };
    }
    return { prompt: [style.promptPrefix, `${spec.assetType} game asset: ${spec.subject}`, spec.visualDescription, `canvas ${spec.canvas}`, spec.transparentBackground ? 'transparent background' : '', style.artStyle, style.cameraAngle, style.lightingDirection].filter(Boolean).join(', '), negativePrompt: style.negativePrompt || 'text, watermark, logo, blurry, inconsistent proportions' };
  }
  async generateImage(_prompt: string, _options: Record<string, unknown>) { const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgQIAAf7QjwAAAABJRU5ErkJggg==', 'base64'); return [{ buffer: png, mimeType: 'image/png', metadata: { mock: true } }]; }
}

export class OpenAICompatibleProvider extends MockAIProvider {
  private isGptImageModel(model: string) { return /^gpt-image/i.test(model); }
  private shouldSendBackgroundParam() { return process.env.AI_IMAGE_USE_BACKGROUND_PARAM === 'true'; }
  private timeoutMs() { return Number(process.env.AI_IMAGE_TIMEOUT_MS || '300000'); }
  private maxRetries() { return Number(process.env.AI_IMAGE_MAX_RETRIES || '2'); }
  private isRetriableStatus(status: number) { return status === 408 || status === 409 || status === 429 || status >= 500; }
  private bodyPreview(text: string) { return text.replace(/\s+/g, ' ').trim().slice(0, 600); }

  private async requestJson(url: string, payload: Record<string, unknown>) {
    const attempts = Math.max(1, this.maxRetries() + 1);
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeoutMs()),
        });
        if (!response.ok) {
          const bodyText = await response.text();
          const requestId = response.headers.get('x-request-id') || response.headers.get('x-client-request-id') || 'unknown-request-id';
          const message = `AI provider returned HTTP ${response.status} [${requestId}]${bodyText ? ` ${this.bodyPreview(bodyText)}` : ''}`;
          if (attempt < attempts && this.isRetriableStatus(response.status)) {
            lastError = new Error(message);
            continue;
          }
          throw new Error(message);
        }
        return response.json();
      } catch (error: any) {
        const message = String(error?.message || error);
        if (attempt < attempts && (error?.name === 'TimeoutError' || error?.name === 'AbortError' || /fetch failed|socket|timeout|timed out/i.test(message))) {
          lastError = new Error(message);
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error('AI provider request failed');
  }

  async generateImage(prompt: string, options: ImageGenerationOptions) {
    const base = (process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.AI_IMAGE_MODEL || 'gpt-image-1';
    const payload: Record<string, unknown> = {
      model,
      prompt,
      size: options.size || '1024x1024',
    };
    if ((options.quantity || 1) > 1) payload.n = options.quantity;
    if (options.background && (this.shouldSendBackgroundParam() || options.requiresTransparentAlpha)) payload.background = options.background;
    if (options.outputFormat) payload.output_format = options.outputFormat;
    if (options.quality) payload.quality = options.quality;
    if (!this.isGptImageModel(model)) payload.response_format = 'b64_json';
    const data: any = await this.requestJson(`${base}/images/generations`, payload);
    return Promise.all((data.data || []).map(async (item: any) => { const buffer = item.b64_json ? Buffer.from(item.b64_json, 'base64') : Buffer.from(await (await fetch(item.url)).arrayBuffer()); return { buffer, mimeType: 'image/png', providerResultId: item.id, seed: item.seed?.toString(), metadata: { revisedPrompt: item.revised_prompt } }; }));
  }
}
