import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { DEPLOYMENT_STATUSES, DeploymentStatus } from './deployment.types';

/**
 * Event subjects, stored in the JetStream stream EVENTS (`events.>`, ADR 0007). Published through
 * the producer's outbox (`addToOutbox`), consumed by durable consumers (`JetStreamConsumer`) with an
 * inbox. Format: `events.<resource>.<past-tense-verb>`: a fact that already happened; nobody answers.
 * Request/reply subjects (if any) use `rpc.*`, never `events.*`.
 */
export const DEPLOYMENT_EVENTS = {
  CREATED: 'events.deployment.created',
  STATUS_CHANGED: 'events.deployment.status-changed',
} as const;

/**
 * Event payloads are classes (not interfaces) so consumers can validate them.
 * Evolve them backward-compatibly: add optional fields, never rename or remove.
 */

export class DeploymentCreatedEvent {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  version: string;

  @IsString()
  environment: string;

  /** Keycloak user id (`sub`) of whoever caused the event. Optional: added later. */
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsISO8601()
  occurredAt: string;
}

export class DeploymentStatusChangedEvent {
  @IsUUID()
  id: string;

  @IsIn(DEPLOYMENT_STATUSES)
  previousStatus: DeploymentStatus;

  @IsIn(DEPLOYMENT_STATUSES)
  status: DeploymentStatus;

  /** Keycloak user id (`sub`) of whoever caused the event. Optional: added later. */
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsISO8601()
  occurredAt: string;
}
