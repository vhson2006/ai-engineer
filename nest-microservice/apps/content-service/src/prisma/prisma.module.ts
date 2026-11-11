import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, PrismaService } from './prisma.service';

/**
 * Imported once in the root module; PrismaService is then injectable everywhere in this app.
 *
 * With driver adapters the connection is opened lazily on the first query ($connect doesn't
 * check the database), so a database that is down doesn't stop the app from starting: the
 * readiness probe (/health → SELECT 1) reports it, and requests get 503 meanwhile.
 */
@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createPrismaClient(config),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationShutdown(): Promise<void> {
    // Tests may replace PrismaService with a plain mock.
    if (typeof this.prisma.$disconnect === 'function') await this.prisma.$disconnect();
  }
}
