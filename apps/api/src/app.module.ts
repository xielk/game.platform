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
  imports: [ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'apps/web/dist'), exclude: ['/api*'] })],
  controllers: [AppController, CatalogController, FilesController, GenerationController, ExportController],
  providers: [PrismaService, AdminGuard, StorageService, GenerationService, ExportService],
})
export class AppModule {}
