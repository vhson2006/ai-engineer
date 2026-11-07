import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Liveness: the process is up. */
  @Get()
  check() {
    return { status: 'ok' };
  }
}
