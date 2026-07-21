import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { AdminGuard } from './shared/admin.guard';
import { StorageService } from './storage/storage.service';
import { CatalogController } from './catalog/catalog.controller';
import { FilesController } from './storage/files.controller';
import { GenerationController } from './generation/generation.controller';
import { GenerationService } from './generation/generation.service';
import { ExportController } from './exports/export.controller';
import { ExportService } from './exports/export.service';

@Module({
  // NestJS 11 ships on Express 5 / path-to-regexp v8, which dropped the bare
  // "*" wildcard — "/api*" throws "Missing parameter name" at request time
  // (breaks every hard refresh on a non-root SPA route, e.g. /generate).
  // The named-wildcard group syntax below is what @nestjs/serve-static itself
  // uses for its own default render path (see DEFAULT_EXPRESS_RENDER_PATH).
  imports: [ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'apps/web/dist'), exclude: ['/api/{*any}'] })],
  controllers: [AppController, CatalogController, FilesController, GenerationController, ExportController],
  providers: [PrismaService, AdminGuard, StorageService, GenerationService, ExportService],
})
export class AppModule {}
