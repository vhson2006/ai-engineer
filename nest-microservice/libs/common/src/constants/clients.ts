/** DI token of the NATS ClientProxy. Inject with `@Inject(NATS_CLIENT) client: ClientProxy`. */
export const NATS_CLIENT = 'NATS_CLIENT';

/**
 * NATS queue groups. Every instance of a service joins the same group, so each message
 * is delivered to exactly ONE instance (load balancing) instead of to all of them.
 */
export const QUEUE_GROUPS = {
  NOTIFICATION: 'notification-service',
} as const;
