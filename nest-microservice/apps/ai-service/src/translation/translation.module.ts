import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxModule } from '../messaging/outbox.module';
import { FakeTranslationProvider } from './providers/fake.provider';
import { GeminiTranslationProvider } from './providers/gemini.provider';
import { TRANSLATION_PROVIDER, type TranslationProvider } from './providers/translation-provider';
import { TranslationService } from './translation.service';

/** The provider of AI_TRANSLATION_PROVIDER (validated in the root module's env schema). */
export function translationProvider(config: ConfigService): TranslationProvider {
  switch (config.getOrThrow<string>('AI_TRANSLATION_PROVIDER')) {
    case 'gemini':
      return new GeminiTranslationProvider(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeTranslationProvider();
  }
}

@Module({
  imports: [OutboxModule],
  providers: [
    { provide: TRANSLATION_PROVIDER, inject: [ConfigService], useFactory: translationProvider },
    TranslationService,
  ],
  exports: [TranslationService],
})
export class TranslationModule {}
