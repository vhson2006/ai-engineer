import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OutboxModule } from '../messaging/outbox.module';
import { TranslationsModule } from '../translations/translations.module';
import { AiResultsConsumer } from './ai-results.consumer';

/** ai-service's answers (ADRs 0036, 0037): one durable consumer, routed to their feature. */
@Module({
  imports: [OutboxModule, TranslationsModule, MediaModule], // OutboxModule: JETSTREAM
  providers: [AiResultsConsumer],
})
export class AiResultsModule {}
