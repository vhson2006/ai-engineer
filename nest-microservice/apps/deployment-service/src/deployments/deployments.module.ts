import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { FilesModule } from '../files/files.module';
import { OutboxModule } from '../messaging/outbox.module';

// PrismaService comes from the global PrismaModule. FilesService attaches uploaded files.
// Events go through the outbox (OutboxModule: relay to JetStream), never straight to NATS.
@Module({
  imports: [FilesModule, OutboxModule],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
})
export class DeploymentsModule {}
