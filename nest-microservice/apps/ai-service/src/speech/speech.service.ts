import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  addToOutbox,
  handleOnce,
  OBJECT_STORAGE,
  OutboxRelay,
  SPEECH_EVENTS,
  type ObjectStorage,
  type SpeechCompletedEvent,
  type SpeechFailedEvent,
  type SpeechRequestedEvent,
  type SpokenLine,
  type TranslationFailure,
} from '@app/common';
import { PrismaService } from '../prisma/prisma.module';
import { ProviderRefusedError } from '../translation/providers/translation-provider';
import { CONSUMER, type Delivery } from '../translation/translation.service';
import {
  SPEECH_PROVIDER,
  type SpeechProvider,
  type SpokenAudio,
} from './providers/speech-provider';

/** A voice file is never rewritten (a new voice is a new job id): cache it forever. */
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** Lines spoken at the same time (provider rate limits). */
const PARALLEL = 3;

/**
 * Speaks the lines of one video (ADR 0039): one provider call per line, each WAV written to
 * `<keyPrefix><lineId>.wav` in the public bucket (only under the site's studio area, whatever the
 * event says), then one answer with every key and duration. All lines or nothing: a video needs
 * each of them. Refusal → failed now; transient → thrown (retried), failed on the last attempt.
 */
@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRelay,
    @Inject(SPEECH_PROVIDER) private readonly provider: SpeechProvider,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async speak(event: SpeechRequestedEvent, delivery: Delivery): Promise<void> {
    const seen = await this.prisma.inboxMessage.findUnique({
      where: { consumer_messageId: { consumer: CONSUMER, messageId: delivery.id } },
      select: { messageId: true },
    });
    if (seen) return;

    const started = Date.now();
    let made: { line: SpokenLine; audio: SpokenAudio }[] = [];
    let failure: unknown;
    try {
      if (!event.keyPrefix.startsWith(`studio/${event.siteId}/`)) {
        throw new ProviderRefusedError('the voice target is outside the site studio area');
      }
      made = await mapLimited(event.lines, PARALLEL, async (line) => {
        const audio = await this.provider.speak({
          text: line.text,
          voice: line.voice,
          language: event.language,
        });
        const key = `${event.keyPrefix}${line.id}.wav`;
        await this.storage.putObject({
          visibility: 'public',
          key,
          contentType: 'audio/wav',
          body: audio.wav,
          cacheControl: IMMUTABLE,
        });
        return {
          line: { id: line.id, key, durationMs: audio.durationMs, size: audio.wav.byteLength },
          audio,
        };
      });
    } catch (error) {
      failure = error;
    }

    const refused = failure instanceof ProviderRefusedError;
    if (failure && !refused && !delivery.last) {
      // transient: JetStream retries
      throw failure instanceof Error ? failure : new Error(describe(failure));
    }

    const base = {
      jobId: event.jobId,
      requester: event.requester,
      siteId: event.siteId,
      task: 'speech',
      provider: this.provider.name,
    };
    await handleOnce(this.prisma, CONSUMER, delivery.id, delivery.subject, async (tx) => {
      if (failure) {
        await tx.aiUsage.create({
          data: { ...base, model: 'n/a', outcome: 'failed', durationMs: Date.now() - started },
        });
        const reason: TranslationFailure = refused
          ? (failure as ProviderRefusedError).reason
          : 'provider_unavailable';
        const failed: SpeechFailedEvent = {
          jobId: event.jobId,
          requester: event.requester,
          siteId: event.siteId,
          reason,
          detail: describe(failure).slice(0, 300),
        };
        await addToOutbox(tx, SPEECH_EVENTS.FAILED, failed);
        return;
      }
      await tx.aiUsage.createMany({
        data: made.map(({ audio }) => ({
          ...base,
          model: audio.model,
          outcome: 'ok',
          inputTokens: audio.inputTokens,
          outputTokens: audio.outputTokens,
          durationMs: audio.durationMs,
        })),
      });
      const completed: SpeechCompletedEvent = {
        jobId: event.jobId,
        requester: event.requester,
        siteId: event.siteId,
        lines: made.map((m) => m.line),
        provider: this.provider.name,
        model: made[0].audio.model,
      };
      await addToOutbox(tx, SPEECH_EVENTS.COMPLETED, completed);
    });
    this.outbox.poke();
    if (failure) {
      this.logger.warn(`job ${event.jobId} failed: ${describe(failure)}`);
    } else {
      this.logger.log(
        `job ${event.jobId}: ${made.length} line(s) by ${this.provider.name} in ${Date.now() - started} ms`,
      );
    }
  }
}

/** Runs `work` on every item, at most `limit` at a time; results in input order. */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    }),
  );
  return results;
}

/** Name and message only: never an error object (it could carry request details). */
function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
