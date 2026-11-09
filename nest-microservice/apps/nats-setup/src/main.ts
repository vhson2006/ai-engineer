import { connect } from 'nats';
import { ensureStreams, reservedFileBytes, STREAM_CONFIGS } from '@app/common/messaging/streams';
import { natsConnectionOptions } from '@app/common/nats/nats-options';

/**
 * The ONE owner of the JetStream streams (ADR 0024): creates missing streams and brings existing
 * ones to `STREAM_CONFIGS`, then exits. Services never do it; they wait for the streams.
 *
 *   k8s:  Job `nats-setup` (image deployment-migrate), before / alongside each rollout
 *   dev:  `npm run nats:setup` (part of `npm run start:dev`), NATS through `npm run k8s:forward`
 *
 * Exit 0 = streams ready; anything else = the Job fails and says why.
 */
async function main(): Promise<void> {
  try {
    process.loadEnvFile(); // dev: .env next to package.json; in k8s the env comes from the Job
  } catch {
    // no .env file
  }
  const url = process.env.NATS_URL;
  if (!url) throw new Error('NATS_URL is not set');

  console.log(`nats-setup: connecting to ${url} (waits until NATS is up)`);
  const nc = await connect(natsConnectionOptions(url, 'nats-setup'));
  try {
    await ensureStreams(await nc.jetstreamManager());
    const names = STREAM_CONFIGS.map((c) => c.name).join(', ');
    const mb = Math.round(reservedFileBytes() / 1024 / 1024);
    console.log(`nats-setup: streams ready (${names}; ${mb} MB reserved on disk)`);
  } finally {
    await nc.drain();
  }
}

main().catch((error: unknown) => {
  console.error('nats-setup failed:', error);
  process.exit(1);
});
