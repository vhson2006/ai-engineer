import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_CLIENT } from '../constants/clients';
import { natsConnectionOptions } from './nats-options';

/** "deployment-service" from dist/apps/deployment-service/main.js (or the src path in watch mode). */
function natsClientName(): string {
  const match = /apps[\\/]([^\\/]+)[\\/]/.exec(process.argv[1] ?? '');
  return `${match?.[1] ?? 'nest-app'}-publisher`;
}

/**
 * Registers the NATS ClientProxy under the NATS_CLIENT token.
 * Import it in any module that sends requests or emits events:
 *   imports: [registerNatsClient()]
 */
export function registerNatsClient(): DynamicModule {
  return ClientsModule.registerAsync([
    {
      name: NATS_CLIENT,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: Transport.NATS,
        // Reconnects forever (see nats-options.ts). Named after the process, e.g. deployment-service.
        options: natsConnectionOptions(config.getOrThrow<string>('NATS_URL'), natsClientName()),
      }),
    },
  ]);
}
