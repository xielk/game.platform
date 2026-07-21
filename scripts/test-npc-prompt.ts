import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MockAIProvider, OpenAICompatibleProvider, DesignInput } from '../apps/api/src/generation/ai.provider';

// Ad-hoc local sanity check for the NPC sprite sheet prompt, without touching
// the database or the web UI. Usage:
//   npx tsx scripts/test-npc-prompt.ts
// Set AI_PROVIDER=openai-compatible in .env to actually call the image API;
// otherwise this only prints the prompt text (useful for reviewing wording).

async function main() {
  const useRealProvider = process.env.AI_PROVIDER === 'openai-compatible';
  const provider = useRealProvider ? new OpenAICompatibleProvider() : new MockAIProvider();

  const input: DesignInput = {
    name: '哥布林',
    description: '绿色皮肤的哥布林战士，破旧皮甲，凶狠表情',
    typeId: 'npc',
    characterName: '哥布林',
    characterDescription: '绿色皮肤的哥布林战士，破旧皮甲，凶狠表情',
    weaponType: '木棒',
    facing: 'right',
  };
  const style = { promptPrefix: 'dark sci-fi neon style, clean silhouette, high contrast, crisp edges, game-ready' };

  const spec = await provider.generateDesignSpec(input, style);
  const { prompt, negativePrompt } = await provider.generatePrompt(spec, style);

  console.log('--- PROMPT ---\n' + prompt);
  console.log('\n--- NEGATIVE PROMPT ---\n' + negativePrompt);
  console.log(`\n--- prompt word count: ${prompt.split(/\s+/).length} ---`);

  if (!useRealProvider) {
    console.log('\nAI_PROVIDER is not "openai-compatible" in .env, so skipping the real image call.');
    console.log('Set AI_PROVIDER=openai-compatible and AI_API_BASE_URL / AI_API_KEY / AI_IMAGE_MODEL, then re-run.');
    return;
  }

  const finalPrompt = negativePrompt ? `${prompt}\n\nAvoid these failure modes: ${negativePrompt}.` : prompt;
  const results = await provider.generateImage(finalPrompt, {
    size: '1024x1024',
    background: 'transparent',
    outputFormat: 'png',
    quality: process.env.AI_IMAGE_QUALITY || 'low',
    requiresTransparentAlpha: true,
  });

  mkdirSync('tmp-test-output', { recursive: true });
  results.forEach((result, index) => {
    const file = `tmp-test-output/npc-sprite-${Date.now()}-${index}.png`;
    writeFileSync(file, result.buffer);
    console.log(`saved: ${file}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
