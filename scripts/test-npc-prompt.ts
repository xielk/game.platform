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
    name: '沼泽兽',
    description: '沼泽兽，四足爬行，湿滑绿色皮肤，背部长有骨刺，口中利齿，尾巴粗壮',
    typeId: 'npc',
    characterName: '沼泽兽 (Swamp Beast)',
    characterDescription: 'a four-legged swamp monster, slick green-brown skin, bony spikes along its back, sharp teeth, a thick tail',
    weaponType: 'its own sharp claws and teeth',
    facing: 'right',
    bodyType: 'creature',
  };
  // Same style anchor the user manually verified as "非常好" at low quality —
  // only the AI_IMAGE_QUALITY env var differs, so this is a clean A/B test.
  const style = {
    promptPrefix: '2D game asset, clean silhouette, high contrast, isolated subject, transparent background, crisp edges, game-ready',
    artStyle: '2D 俯视/斜俯视，霓虹高亮，清晰轮廓，游戏素材风格统一',
  };

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
