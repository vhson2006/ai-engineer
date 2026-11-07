import { z } from 'zod';

/**
 * The create-deployment form, validated with the SAME schema in the browser (react-hook-form) and
 * in the Server Action (parseInput). Messages are keys of the `validation` dictionary.
 * Mirrors CreateDeploymentDto (nest-microservice libs/common): name ≤ 100, semver ≤ 50,
 * environment ≤ 30, description ≤ 2000. The owner is never a field: the API takes it from the token.
 */
export const ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export const createDeploymentSchema = z.object({
  /** One per form instance: a double submit returns the first result (once()). */
  submissionId: z.uuid('invalid'),
  name: z.string('required').trim().min(1, 'required').max(100, 'tooLong'),
  version: z
    .string('required')
    .trim()
    .min(1, 'required')
    .max(50, 'tooLong')
    .regex(/^\d+\.\d+\.\d+([-+][\w.]+)?$/, 'invalidVersion'),
  environment: z.enum(ENVIRONMENTS, 'invalid'),
  description: z.string().trim().max(2000, 'tooLong').optional(),
});

export type CreateDeploymentValues = z.input<typeof createDeploymentSchema>;
