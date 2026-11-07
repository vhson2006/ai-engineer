import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LevelWithSilent } from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { accessLogOptions, LogFormat } from './access-log';

/**
 * Structured JSON logging (pino) + one access log line per HTTP request.
 * Import in the root module, then in main.ts:
 *   const app = await NestFactory.create(AppModule, { bufferLogs: true });
 *   app.useLogger(app.get(Logger));          // Logger from 'nestjs-pino'
 * so every Nest `Logger` call is written by pino too (with the requestId inside a request).
 *
 * Env (validate with Joi): LOG_LEVEL (default info), LOG_FORMAT json|pretty (default json).
 */
export function registerLogging(service: string): DynamicModule {
  return LoggerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      pinoHttp: accessLogOptions({
        service,
        level: config.get<LevelWithSilent>('LOG_LEVEL', 'info'),
        format: config.get<LogFormat>('LOG_FORMAT', 'json'),
      }),
    }),
  });
}
