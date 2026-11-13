import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxModule } from '../messaging/outbox.module';
import { FakeScriptWriter } from './providers/fake-script.writer';
import { GeminiScriptWriter } from './providers/gemini-script.writer';
import { SCRIPT_WRITER, type ScriptWriter } from './providers/script-writer';
import { ScriptService } from './script.service';

/** The writer of AI_SCRIPT_PROVIDER (validated in the root module's env schema). */
export function scriptWriter(config: ConfigService): ScriptWriter {
  switch (config.getOrThrow<string>('AI_SCRIPT_PROVIDER')) {
    case 'gemini':
      return new GeminiScriptWriter(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeScriptWriter();
  }
}

/** Video scripts (ADR 0039). */
@Module({
  imports: [OutboxModule],
  providers: [
    { provide: SCRIPT_WRITER, inject: [ConfigService], useFactory: scriptWriter },
    ScriptService,
  ],
  exports: [ScriptService],
})
export class ScriptsModule {}
