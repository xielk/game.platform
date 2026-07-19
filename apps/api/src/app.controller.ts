import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './shared/admin.guard';
import { PrismaService } from './prisma.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: '2d-game-asset-studio', timestamp: new Date().toISOString() };
  }

  @Post('auth/login')
  login(@Body() body: { token?: string }) {
    const expected = process.env.ADMIN_TOKEN;
    if (expected && body.token !== expected) throw new UnauthorizedException('管理员令牌无效');
    return { ok: true, role: 'admin' };
  }

  @Get('runtime-config')
  @UseGuards(AdminGuard)
  runtimeConfig() {
    return {
      aiProvider: process.env.AI_PROVIDER || 'mock',
      aiApiBaseUrl: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
      aiImageModel: process.env.AI_IMAGE_MODEL || 'gpt-image-1',
      hasAiApiKey: Boolean(process.env.AI_API_KEY),
    };
  }
}
