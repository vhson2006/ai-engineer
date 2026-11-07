import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('[notifications.service] (unit)', () => {
  const service = new NotificationsService();

  afterEach(() => jest.restoreAllMocks());

  it('warns when a deployment fails', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.statusChanged({
      id: '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f',
      previousStatus: 'running',
      status: 'failed',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('running → failed'));
  });
});
