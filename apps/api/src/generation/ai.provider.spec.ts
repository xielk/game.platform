import { MockAIProvider, OpenAICompatibleProvider } from './ai.provider';

describe('MockAIProvider', () => {
  it('injects style constraints into the confirmed prompt', async () => {
    const provider = new MockAIProvider();
    const style = { artStyle: 'hand-painted', cameraAngle: 'three-quarter top-down', frameCanvasSize: '512x512', promptPrefix: 'consistent forest world' };
    const spec = await provider.generateDesignSpec({ name: 'Goblin', description: 'red scarf archer', typeId: 'enemy' }, style);
    const result = await provider.generatePrompt(spec, style);
    expect(result.prompt).toContain('consistent forest world');
    expect(result.prompt).toContain('three-quarter top-down');
    expect(result.negativePrompt).toContain('watermark');
  });

  it('keeps the complete NPC identity without hard-coded elf traits', async () => {
    const provider = new MockAIProvider();
    const description = `${'green forest creature with bark armor, '.repeat(12)}distinctive violet flower badge`;
    const spec = await provider.generateDesignSpec({ name: 'Forest Guard', description, typeId: 'npc', weaponType: 'wooden spear' }, {});
    const result = await provider.generatePrompt(spec, { promptPrefix: 'dark neon game art, crisp edges', negativePrompt: 'blurry' });

    expect(result.prompt).toContain('distinctive violet flower badge');
    expect(result.prompt).toContain('wooden spear');
    expect(result.prompt).toContain('dark neon game art, crisp edges');
    expect(result.prompt).toContain('overrides any different weapon');
    expect(result.prompt).not.toContain('young elf prince');
    expect(result.prompt).not.toContain('pointed elf ears');
    expect(result.negativePrompt).toContain('blurry');
    expect(result.negativePrompt).toContain('malformed anatomy or face');
  });
});

describe('OpenAICompatibleProvider', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the standard GPT image payload without response_format or background by default', async () => {
    process.env.AI_API_BASE_URL = 'https://example.test/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_IMAGE_MODEL = 'gpt-image-2';

    const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from('png').toString('base64') }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    global.fetch = fetchMock as typeof global.fetch;

    const provider = new OpenAICompatibleProvider();
    await provider.generateImage('forest goblin', { quantity: 1, size: '1024x1024', background: 'transparent', outputFormat: 'png', quality: 'high' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe('gpt-image-2');
    expect(payload.n).toBeUndefined();
    expect(payload.background).toBeUndefined();
    expect(payload.output_format).toBe('png');
    expect(payload.quality).toBe('high');
    expect(payload.response_format).toBeUndefined();
  });

  it('only sends n when multiple images are requested', async () => {
    process.env.AI_API_BASE_URL = 'https://example.test/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_IMAGE_MODEL = 'gpt-image-2';

    const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from('png').toString('base64') }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    global.fetch = fetchMock as typeof global.fetch;

    const provider = new OpenAICompatibleProvider();
    await provider.generateImage('forest goblin', { quantity: 2, size: '1024x1024', outputFormat: 'png', quality: 'low' });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.n).toBe(2);
  });

  it('can opt into the background parameter explicitly', async () => {
    process.env.AI_API_BASE_URL = 'https://example.test/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_IMAGE_MODEL = 'gpt-image-2';
    process.env.AI_IMAGE_USE_BACKGROUND_PARAM = 'true';

    const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from('png').toString('base64') }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    global.fetch = fetchMock as typeof global.fetch;

    const provider = new OpenAICompatibleProvider();
    await provider.generateImage('forest goblin', { quantity: 1, size: '1024x1024', background: 'opaque', outputFormat: 'png', quality: 'low' });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.background).toBe('opaque');
  });

  it('retries retriable provider failures', async () => {
    process.env.AI_API_BASE_URL = 'https://example.test/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_IMAGE_MODEL = 'gpt-image-2';
    process.env.AI_IMAGE_MAX_RETRIES = '1';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'gateway timeout' }), { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ b64_json: Buffer.from('png').toString('base64') }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    global.fetch = fetchMock as typeof global.fetch;

    const provider = new OpenAICompatibleProvider();
    const results = await provider.generateImage('forest goblin', { quantity: 1, size: '1024x1024' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
  });
});
