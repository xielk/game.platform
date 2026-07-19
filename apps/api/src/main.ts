import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { BigIntInterceptor } from './shared/bigint.interceptor';
import { configureEnvironment } from './shared/environment';

async function bootstrap() {
  configureEnvironment();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new BigIntInterceptor());
  const config = new DocumentBuilder().setTitle('2D Game Asset Studio API').setDescription('素材生产、版本、关系与导出 REST API').setVersion('1.0').addApiKey({ type: 'apiKey', name: 'x-admin-token', in: 'header' }, 'admin').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`2D Game Asset Studio listening on http://0.0.0.0:${port}`);
}

bootstrap();
