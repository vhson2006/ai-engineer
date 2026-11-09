import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StorageType, type JetStreamManager, type StreamConfig, type StreamInfo } from 'nats';
import { ensureStreams, reservedFileBytes, STREAM_CONFIGS, waitForStreams } from './streams';

const notFound = () => Object.assign(new Error('stream not found'), { code: '404' });
const insufficientStorage = () =>
  Object.assign(new Error('insufficient storage resources available'), {
    api_error: { err_code: 10047 },
  });

/** A fake JetStreamManager holding streams in a map. */
function fakeJsm(existing: Partial<StreamConfig>[] = []) {
  const streams = new Map(existing.map((c) => [c.name as string, { ...c } as StreamConfig]));
  const api = {
    info: jest.fn((name: string): Promise<StreamInfo> => {
      const config = streams.get(name);
      return config ? Promise.resolve({ config } as StreamInfo) : Promise.reject(notFound());
    }),
    add: jest.fn((config: Partial<StreamConfig>): Promise<StreamInfo> => {
      streams.set(config.name as string, { ...config } as StreamConfig);
      return Promise.resolve({ config } as StreamInfo);
    }),
    update: jest.fn((name: string, config: Partial<StreamConfig>): Promise<StreamInfo> => {
      streams.set(name, { ...streams.get(name), ...config } as StreamConfig);
      return Promise.resolve({ config } as StreamInfo);
    }),
  };
  return { jsm: { streams: api } as unknown as Pick<JetStreamManager, 'streams'>, api, streams };
}

describe('[messaging] ensureStreams', () => {
  it('creates missing streams', async () => {
    const { jsm, api } = fakeJsm();
    await ensureStreams(jsm);
    expect(api.add).toHaveBeenCalledTimes(STREAM_CONFIGS.length);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('does not write when the streams already match (normal restart)', async () => {
    const { jsm, api } = fakeJsm(STREAM_CONFIGS);
    await ensureStreams(jsm);
    expect(api.add).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('updates a stream whose config changed, ignoring fields it does not set', async () => {
    const [events, ...rest] = STREAM_CONFIGS;
    const { jsm, api } = fakeJsm([
      { ...events, max_bytes: 1, first_seq: 1 },
      ...rest.map((c) => ({ ...c, sealed: false })),
    ]);
    await ensureStreams(jsm);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(events.name, events);
  });

  it('survives losing the create race to another service (NATS answers 10047)', async () => {
    const { jsm, api, streams } = fakeJsm();
    // Another process creates the stream between our info and our add.
    api.add.mockImplementation((config: Partial<StreamConfig>) => {
      streams.set(config.name as string, { ...config } as StreamConfig);
      return Promise.reject(insufficientStorage());
    });
    await expect(ensureStreams(jsm)).resolves.toBeUndefined();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('rethrows a create error when the stream still does not exist', async () => {
    const { jsm, api } = fakeJsm();
    api.add.mockRejectedValue(insufficientStorage());
    await expect(ensureStreams(jsm)).rejects.toThrow('insufficient storage resources available');
  });

  it('rethrows errors other than "not found" from info', async () => {
    const { jsm, api } = fakeJsm();
    api.info.mockRejectedValue(new Error('timeout'));
    await expect(ensureStreams(jsm)).rejects.toThrow('timeout');
    expect(api.add).not.toHaveBeenCalled();
  });
});

describe('[messaging] waitForStreams (services)', () => {
  it('returns at once when every stream exists, without writing', async () => {
    const { jsm, api } = fakeJsm(STREAM_CONFIGS);
    await waitForStreams(jsm, { intervalMs: 1 });
    expect(api.add).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('waits until nats-setup has created the streams', async () => {
    const { jsm, api, streams } = fakeJsm();
    const onWait = jest.fn((missing: string[]) => {
      // nats-setup finishes while the service waits
      for (const c of STREAM_CONFIGS) streams.set(c.name as string, c as StreamConfig);
      return missing;
    });
    await waitForStreams(jsm, { intervalMs: 1, onWait });
    expect(onWait).toHaveBeenCalledWith(STREAM_CONFIGS.map((c) => c.name));
    expect(api.add).not.toHaveBeenCalled();
  });

  it('gives up after the timeout and names the missing streams', async () => {
    const { jsm } = fakeJsm();
    await expect(waitForStreams(jsm, { timeoutMs: 5, intervalMs: 1 })).rejects.toThrow(
      /streams missing: EVENTS, DLQ.*nats-setup/,
    );
  });
});

/**
 * Storage budget (ADR 0024). JetStream reserves every file stream's max_bytes × replicas up front;
 * a stream that doesn't fit is refused with "insufficient storage resources available". Reads the
 * real NATS manifests so a change on either side (a new stream, a bigger max_bytes, a smaller
 * volume) fails here, before it fails in a cluster. An overlay patching these values must be
 * added here.
 */
describe('[messaging] JetStream storage budget', () => {
  const natsDir = join(__dirname, '../../../../../k8s/components/nats');
  const sizes: Record<string, number> = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
  const pvcUnits: Record<string, number> = { Mi: 1024 ** 2, Gi: 1024 ** 3 };

  const maxFileStore = (() => {
    const m = /max_file_store:\s*(\d+)\s*(KB|MB|GB)/.exec(
      readFileSync(join(natsDir, 'configmap.yaml'), 'utf8'),
    );
    if (!m) throw new Error('max_file_store not found in k8s/components/nats/configmap.yaml');
    return Number(m[1]) * sizes[m[2]];
  })();

  const volume = (() => {
    const m = /storage:\s*(\d+)(Mi|Gi)/.exec(
      readFileSync(join(natsDir, 'statefulset.yaml'), 'utf8'),
    );
    if (!m) throw new Error('volume size not found in k8s/components/nats/statefulset.yaml');
    return Number(m[1]) * pvcUnits[m[2]];
  })();

  it.each(STREAM_CONFIGS.filter((c) => c.storage === StorageType.File).map((c) => [c.name, c]))(
    'file stream %s has a max_bytes (an unbounded stream could fill the disk)',
    (_name, config) => {
      expect(config.max_bytes).toBeGreaterThan(0);
    },
  );

  it('Σ max_bytes × num_replicas fits max_file_store', () => {
    expect(reservedFileBytes()).toBeLessThanOrEqual(maxFileStore);
  });

  it('max_file_store leaves headroom on the volume (≤ 90 %)', () => {
    expect(maxFileStore).toBeLessThanOrEqual(volume * 0.9);
  });

  it('counts replicas and ignores memory streams', () => {
    expect(
      reservedFileBytes([
        { storage: StorageType.File, max_bytes: 100, num_replicas: 3 },
        { storage: StorageType.Memory, max_bytes: 1000 },
        { storage: StorageType.File, max_bytes: 10 },
      ]),
    ).toBe(310);
  });
});
