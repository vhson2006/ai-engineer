import { Logger } from '@nestjs/common';
import { AckPolicy, DeliverPolicy, headers as natsHeaders, nanos, type JsMsg } from 'nats';
import { consumerDuration, consumerMessages } from '../observability/metrics';
import { withConsumerSpan } from '../observability/tracing';
import type { JetStreamHandle } from './jetstream.module';
import { MESSAGE_ID_HEADER } from './outbox';
import { DLQ_STREAM, EVENTS_STREAM, isNotFound } from './streams';

/**
 * A durable JetStream consumer (ADR 0007): at-least-once delivery to `handlers`, by subject.
 *
 *   handler resolves             → ack
 *   PermanentMessageError         → copied to the DLQ stream, term (never redelivered)
 *   any other error               → nak with backoff (redelivered), up to `maxDeliver` attempts,
 *                                   then copied to the DLQ and term
 *   process dies before ack       → redelivered after `ackWaitMs`
 *
 * Several replicas share one durable consumer: each message goes to one of them. Handlers must be
 * idempotent: wrap their database work in `handleOnce` (inbox.ts).
 */

export class PermanentMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentMessageError';
  }
}

export interface IncomingMessage<T = unknown> {
  /** Message id (Nats-Msg-Id, = the producer's outbox id): the inbox key. */
  id: string;
  subject: string;
  data: T;
  deliveryCount: number;
}

export type MessageHandler = (message: IncomingMessage) => Promise<void>;

export interface ConsumerOptions {
  /** Durable consumer name, also the inbox `consumer` value: "notification". */
  durable: string;
  stream?: string;
  /** Subjects → handler. Only these subjects are delivered to this consumer. */
  handlers: Record<string, MessageHandler>;
  maxDeliver?: number;
  /** Delay before each redelivery after a failure (last value repeats). */
  backoffMs?: number[];
  /** Redelivery when the process dies without acking (or a handler runs longer). */
  ackWaitMs?: number;
}

const DEFAULT_BACKOFF_MS = [1_000, 5_000, 30_000, 120_000, 600_000];

export class JetStreamConsumer {
  private readonly logger: Logger;
  private stopped = false;
  private loop?: Promise<void>;
  private stopCurrent?: () => void;

  constructor(
    private readonly jetstream: JetStreamHandle,
    private readonly options: ConsumerOptions,
  ) {
    this.logger = new Logger(`Consumer:${options.durable}`);
  }

  async start(): Promise<void> {
    await this.ensureConsumer();
    this.loop = this.run();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.stopCurrent?.();
    await this.loop?.catch(() => undefined);
  }

  private get stream(): string {
    return this.options.stream ?? EVENTS_STREAM;
  }

  private async ensureConsumer(): Promise<void> {
    const { jsm } = this.jetstream;
    const config = {
      durable_name: this.options.durable,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      filter_subjects: Object.keys(this.options.handlers),
      ack_wait: nanos(this.options.ackWaitMs ?? 30_000),
      // One more than ours: we dead-letter on the last attempt ourselves (with the reason).
      max_deliver: (this.options.maxDeliver ?? 10) + 1,
    };
    try {
      await jsm.consumers.info(this.stream, this.options.durable);
      await jsm.consumers.update(this.stream, this.options.durable, config);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await jsm.consumers.add(this.stream, config);
    }
  }

  private async run(): Promise<void> {
    while (!this.stopped) {
      try {
        const consumer = await this.jetstream.js.consumers.get(this.stream, this.options.durable);
        const messages = await consumer.consume({ max_messages: 20 });
        this.stopCurrent = () => void messages.stop();
        this.logger.log(
          `Consuming ${Object.keys(this.options.handlers).join(', ')} from ${this.stream}`,
        );
        for await (const msg of messages) {
          await this.handle(msg);
          if (this.stopped) break;
        }
      } catch (error) {
        if (this.stopped) break;
        this.logger.warn(`Consumer loop error, restarting in 2 s: ${describe(error)}`);
        await new Promise((r) => setTimeout(r, 2000));
        await this.ensureConsumer().catch(() => undefined); // deleted by hand? recreate
      }
    }
  }

  /**
   * One delivery: inside a CONSUMER span, counted in `messaging_consumer_messages_total` by outcome
   * (`nak` → `retry`) and timed in `messaging_consumer_duration_seconds`. Exposed for tests.
   */
  async handle(msg: JsMsg): Promise<'ack' | 'nak' | 'dlq'> {
    const id = msg.headers?.get(MESSAGE_ID_HEADER) || `${msg.info.stream}:${msg.seq}`;
    const labels = { consumer: this.options.durable, subject: msg.subject };
    const end = consumerDuration.startTimer(labels);
    const outcome = await withConsumerSpan(this.options.durable, msg.subject, id, async (span) => {
      const result = await this.process(msg, id);
      span.setAttribute('messaging.outcome', result);
      return result;
    });
    end();
    consumerMessages.inc({ ...labels, outcome: outcome === 'nak' ? 'retry' : outcome });
    return outcome;
  }

  private async process(msg: JsMsg, id: string): Promise<'ack' | 'nak' | 'dlq'> {
    const maxDeliver = this.options.maxDeliver ?? 10;
    const handler = this.options.handlers[msg.subject];
    const label = `${msg.subject} ${id} (delivery ${msg.info.deliveryCount})`;

    try {
      if (!handler) throw new PermanentMessageError(`no handler for ${msg.subject}`);
      let data: unknown;
      try {
        data = JSON.parse(new TextDecoder().decode(msg.data));
      } catch {
        throw new PermanentMessageError('payload is not JSON');
      }
      await handler({ id, subject: msg.subject, data, deliveryCount: msg.info.deliveryCount });
      msg.ack();
      return 'ack';
    } catch (error) {
      const permanent = error instanceof PermanentMessageError;
      if (permanent || msg.info.deliveryCount >= maxDeliver) {
        const reason = permanent
          ? `permanent: ${describe(error)}`
          : `gave up after ${maxDeliver} attempts: ${describe(error)}`;
        if (!(await this.deadLetter(msg, id, reason))) return 'nak'; // DLQ unavailable: redelivered later
        msg.term(describe(error));
        return 'dlq';
      }
      const backoff = this.options.backoffMs ?? DEFAULT_BACKOFF_MS;
      const delay = backoff[Math.min(msg.info.deliveryCount - 1, backoff.length - 1)];
      this.logger.warn(`${label} failed, retry in ${delay} ms: ${describe(error)}`);
      msg.nak(delay);
      return 'nak';
    }
  }

  /** Copies the message to the DLQ stream. False when that failed (the message is nak'ed instead). */
  private async deadLetter(msg: JsMsg, id: string, reason: string): Promise<boolean> {
    const h = natsHeaders();
    for (const [k, v] of msg.headers ?? []) for (const value of v) h.append(k, value);
    h.set('Dlq-Reason', reason.slice(0, 500));
    h.set('Dlq-Original-Subject', msg.subject);
    h.set('Dlq-Consumer', this.options.durable);
    try {
      await this.jetstream.js.publish(`dlq.${this.options.durable}.${msg.subject}`, msg.data, {
        msgID: `${id}:${this.options.durable}`,
        headers: h,
        expect: { streamName: DLQ_STREAM },
      });
      this.logger.error(`${msg.subject} ${id} dead-lettered: ${reason}`);
      return true;
    } catch (error) {
      // Can't record it in the DLQ: don't lose it, let JetStream redeliver later.
      this.logger.error(
        `${msg.subject} ${id} could not be dead-lettered (${describe(error)}); redelivering`,
      );
      msg.nak(60_000);
      return false;
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
