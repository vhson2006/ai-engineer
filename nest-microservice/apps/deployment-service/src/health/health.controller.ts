import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '@app/common';
import { PrismaService } from '../prisma/prisma.service';

/** Probes have no token. Never publish this route in KrakenD. */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Readiness: process is up AND the database answers. 503 otherwise. */
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
  }
}
