import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_DATABASE && process.env.DB_USERNAME) {
  process.env.DATABASE_URL = `mysql://${encodeURIComponent(process.env.DB_USERNAME)}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || '3306'}/${encodeURIComponent(process.env.DB_DATABASE)}`;
}

const prisma = new PrismaClient();

const types = [
  ['enemy', '敌人', 'character'], ['mini_boss', '小型 Boss', 'character'], ['boss', 'Boss', 'character'],
  ['tower', '防御塔', 'character'], ['hero', '英雄', 'character'], ['npc', 'NPC', 'character'],
  ['skill', '技能', 'combat'], ['projectile', '子弹', 'combat'], ['vfx', '特效', 'combat'],
  ['item', '道具', 'economy'], ['currency', '货币', 'economy'], ['card', '卡片', 'ui'],
  ['ui', '界面', 'ui'], ['icon', '图标', 'ui'], ['audio', '音效', 'audio'], ['music', '音乐', 'audio'],
  ['tileset', '图块集', 'map'], ['map', '地图', 'map'], ['background', '背景', 'environment'],
  ['decoration', '装饰物', 'environment'], ['building', '建筑', 'environment'], ['obstacle', '障碍物', 'environment'],
] as const;

async function main() {
  for (const [typeId, name, category] of types) {
    await prisma.assetType.upsert({
      where: { typeId },
      update: { name, category, isEnabled: true },
      create: { typeId, name, category, allowedMimeTypes: ['image/png', 'image/webp', 'audio/mpeg', 'audio/ogg', 'application/json'] },
    });
  }
}

main().finally(() => prisma.$disconnect());
