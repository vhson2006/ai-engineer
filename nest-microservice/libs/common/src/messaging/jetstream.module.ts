import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { connect, type JetStreamClient, type JetStreamManager, type NatsConnection } from 'nats';
import { natsConnectionOptions } from '../nats/nats-options';
import { ensureStreams } from './streams';

export const JETSTREAM = Symbol('JETSTREAM');

/** One NATS connection per process with its JetStream client and manager. */
export interface JetStreamHandle {
  nc: NatsConnection;
  js: JetStreamClient;
  jsm: JetStreamManager;
}

@Injectable()
class JetStreamCloser implements OnApplicationShutdown {
  constructor(@Inject(JETSTREAM) private readonly handle: JetStreamHandle) {}
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.handle.nc.drain(); // finishes in-flight publishes and acks, then closes
    } catch {
      // already closed
    }
  }
}

/**
 * `imports: [JetStreamModule.forRoot('deployment-service')]` → inject `@Inject(JETSTREAM)`.
 * Connects with natsConnectionOptions (reconnects forever, waits for NATS at startup, ADR 0008)
 * and makes sure the streams exist (streams.ts).
 */
@Module({})
export class JetStreamModule {
  static forRoot(connectionName: string): DynamicModule {
    return {
      module: JetStreamModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: JETSTREAM,
          inject: [ConfigService],
          useFactory: async (config: ConfigService): Promise<JetStreamHandle> => {
            const logger = new Logger('JetStream');
            const nc = await connect(
              natsConnectionOptions(config.getOrThrow<string>('NATS_URL'), connectionName),
            );
            const jsm = await nc.jetstreamManager();
            await ensureStreams(jsm);
            logger.log(`Connected to ${nc.getServer()} as ${connectionName}; streams ready`);
            return { nc, js: nc.jetstream(), jsm };
          },
        },
        JetStreamCloser,
      ],
      exports: [JETSTREAM],
    };
  }
}
