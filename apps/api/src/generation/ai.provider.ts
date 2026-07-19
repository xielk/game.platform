export interface DesignInput { name: string; description: string; typeId: string; targetSize?: string; transparent?: boolean; animation?: string; quantity?: number; }
export interface ImageResult { buffer: Buffer; mimeType: string; providerResultId?: string; seed?: string; metadata?: Record<string, unknown>; }
type ImageGenerationOptions = Record<string, unknown> & {
  quantity?: number;
  size?: string;
  background?: 'transparent' | 'opaque' | 'auto';
  outputFormat?: 'png' | 'webp' | 'jpeg';
  quality?: 'low' | 'medium' | 'high' | 'auto';
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
  async generateDesignSpec(input: DesignInput, style: Record<string, unknown>) { return { subject: input.name, assetType: input.typeId, visualDescription: input.description, canvas: input.targetSize || style.frameCanvasSize || '1024x1024', transparentBackground: input.transparent ?? true, animation: input.animation || null, consistency: { cameraAngle: style.cameraAngle, artStyle: style.artStyle, palette: style.colorPalette } }; }
  async generatePrompt(spec: Record<string, any>, style: Record<string, any>) { return { prompt: [style.promptPrefix, `${spec.assetType} game asset: ${spec.subject}`, spec.visualDescription, `canvas ${spec.canvas}`, spec.transparentBackground ? 'transparent background' : '', style.artStyle, style.cameraAngle, style.lightingDirection].filter(Boolean).join(', '), negativePrompt: style.negativePrompt || 'text, watermark, logo, blurry, inconsistent proportions' }; }
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
    if (options.background && this.shouldSendBackgroundParam()) payload.background = options.background;
    if (options.outputFormat) payload.output_format = options.outputFormat;
    if (options.quality) payload.quality = options.quality;
    if (!this.isGptImageModel(model)) payload.response_format = 'b64_json';
    const data: any = await this.requestJson(`${base}/images/generations`, payload);
    return Promise.all((data.data || []).map(async (item: any) => { const buffer = item.b64_json ? Buffer.from(item.b64_json, 'base64') : Buffer.from(await (await fetch(item.url)).arrayBuffer()); return { buffer, mimeType: 'image/png', providerResultId: item.id, seed: item.seed?.toString(), metadata: { revisedPrompt: item.revised_prompt } }; }));
  }
}
