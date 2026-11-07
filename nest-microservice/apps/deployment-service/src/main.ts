import './instrument'; // first: starts tracing before anything else is loaded
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DeploymentServiceModule } from './deployment-service.module';
import { configureApp } from './setup';

/**
 * Plain HTTP app: REST API under /api (reached by clients through KrakenD), /health for probes.
 * It doesn't listen on NATS; it only PUBLISHES events (deployments.created, ...) via NATS_CLIENT.
 */
async function bootstrap() {
  // bufferLogs: startup logs are held until configureApp() switches Nest to pino.
  const app = await NestFactory.create(DeploymentServiceModule, { bufferLogs: true });
  configureApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('DEPLOYMENT_PORT');
  await app.listen(port);
  Logger.log(
    `REST on http://localhost:${port}/api, Swagger on /docs, health on /health`,
    'DeploymentService',
  );
}

void bootstrap();
