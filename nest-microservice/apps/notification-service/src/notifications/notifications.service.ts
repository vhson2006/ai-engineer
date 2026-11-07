import { Injectable, Logger } from '@nestjs/common';
import { DeploymentCreatedEvent, DeploymentStatusChangedEvent } from '@app/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Placeholder: replace the log with email / Slack / webhook delivery. */
  deploymentCreated(event: DeploymentCreatedEvent): Promise<void> {
    this.logger.log(
      `Deployment ${event.name}@${event.version} created for ${event.environment} (${event.id})` +
        (event.actorId ? ` by user ${event.actorId}` : ''),
    );
    return Promise.resolve();
  }

  statusChanged(event: DeploymentStatusChangedEvent): Promise<void> {
    const level = event.status === 'failed' ? 'warn' : 'log';
    this.logger[level](
      `Deployment ${event.id}: ${event.previousStatus} → ${event.status}` +
        (event.actorId ? ` by user ${event.actorId}` : ''),
    );
    return Promise.resolve();
  }
}
