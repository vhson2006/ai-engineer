import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * The ai-service's database ("ai": inbox, outbox, usage ledger, ADR 0036). Abstract class = DI
 * token + type. Same AI_DB_* variables as the CLI config (../../prisma.config.ts). The
 * connection opens lazily on the first query: a database that is down doesn't stop startup;
 * messages are then nak'ed and redelivered until it is back.
 */
export abstract class PrismaService extends PrismaClient {}

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PrismaClient({
          adapter: new PrismaPg({
            host: config.getOrThrow<string>('AI_DB_HOST'),
            port: config.getOrThrow<number>('AI_DB_PORT'),
            user: config.getOrThrow<string>('AI_DB_USER'),
            password: config.getOrThrow<string>('AI_DB_PASSWORD'),
            database: config.getOrThrow<string>('AI_DB_NAME'),
            connectionTimeoutMillis: 5000,
          }),
        }),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationShutdown(): Promise<void> {
    if (typeof this.prisma.$disconnect === 'function') await this.prisma.$disconnect();
  }
}
