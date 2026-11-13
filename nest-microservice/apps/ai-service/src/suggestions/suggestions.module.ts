import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '@app/common';
import { OutboxModule } from '../messaging/outbox.module';
import { FakeFactSuggester } from './providers/fake-fact.suggester';
import { GeminiFactSuggester } from './providers/gemini-fact.suggester';
import { FACT_SUGGESTER, type FactSuggester } from './providers/fact-suggester';
import { SuggestionService } from './suggestion.service';

/** The suggester of AI_SCRIPT_PROVIDER: the same text model writes the drafts and the scripts. */
export function factSuggester(config: ConfigService): FactSuggester {
  switch (config.getOrThrow<string>('AI_SCRIPT_PROVIDER')) {
    case 'gemini':
      return new GeminiFactSuggester(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeFactSuggester();
  }
}

/** "Suggest with AI" for the video studio's fields (ADR 0039); images read from StorageModule. */
@Module({
  imports: [OutboxModule, StorageModule],
  providers: [
    { provide: FACT_SUGGESTER, inject: [ConfigService], useFactory: factSuggester },
    SuggestionService,
  ],
  exports: [SuggestionService],
})
export class SuggestionsModule {}
