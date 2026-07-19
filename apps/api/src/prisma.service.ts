import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('MariaDB connection established');
    } catch (error: any) {
      const code = error?.code ? ` (${error.code})` : '';
      this.logger.error(`MariaDB connection failed${code}. Verify host, port, database, credentials and MariaDB user Host permissions.`);
      throw new Error('Database connection failed; credentials were intentionally omitted from logs.');
    }
  }

  async onModuleDestroy() { await this.$disconnect(); }
}
