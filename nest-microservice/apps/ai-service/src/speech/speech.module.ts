import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '@app/common';
import { OutboxModule } from '../messaging/outbox.module';
import { FakeSpeechProvider } from './providers/fake-speech.provider';
import { GeminiSpeechProvider } from './providers/gemini-speech.provider';
import { SPEECH_PROVIDER, type SpeechProvider } from './providers/speech-provider';
import { SpeechService } from './speech.service';

/** The provider of AI_SPEECH_PROVIDER (validated in the root module's env schema). */
export function speechProvider(config: ConfigService): SpeechProvider {
  switch (config.getOrThrow<string>('AI_SPEECH_PROVIDER')) {
    case 'gemini':
      return new GeminiSpeechProvider(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_TTS_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeSpeechProvider();
  }
}

/** Text to speech for the video studio (ADR 0039): WAVs to the public bucket (StorageModule). */
@Module({
  imports: [OutboxModule, StorageModule],
  providers: [
    { provide: SPEECH_PROVIDER, inject: [ConfigService], useFactory: speechProvider },
    SpeechService,
  ],
  exports: [SpeechService],
})
export class SpeechModule {}
