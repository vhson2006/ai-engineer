import './instrument'; // first: starts tracing before anything else is loaded
import './env'; // second: this API's own token audience, before the module validates env
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ContentServiceModule } from './content-service.module';
import { configureApp } from './setup';

/**
 * Plain HTTP app: REST API under /api/content (reached by the web apps' servers through KrakenD),
 * /health for probes. It doesn't consume events; it PUBLISHES article events through its outbox.
 */
async function bootstrap() {
  // bufferLogs: startup logs are held until configureApp() switches Nest to pino.
  const app = await NestFactory.create(ContentServiceModule, { bufferLogs: true });
  configureApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('CONTENT_PORT');
  await app.listen(port);
  Logger.log(
    `REST on http://localhost:${port}/api/content, Swagger on /docs, health on /health`,
    'ContentService',
  );
}

void bootstrap();
