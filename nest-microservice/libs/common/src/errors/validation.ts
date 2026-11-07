import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { FieldError } from './problem-details';

/**
 * 400 thrown by the ValidationPipe, carrying one entry per invalid field, so the problem body
 * says WHICH field is wrong (Nest's default only gives a flat list of sentences).
 *
 *   new ValidationPipe({ ..., exceptionFactory: validationExceptionFactory })   (setup.ts)
 */
export class ValidationProblemException extends BadRequestException {
  constructor(readonly errors: FieldError[]) {
    super('The request is invalid');
  }
}

export function validationExceptionFactory(errors: ValidationError[]): ValidationProblemException {
  return new ValidationProblemException(flatten(errors));
}

/** Nested DTOs and arrays become paths: "address.city", "items[0].price". */
function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = /^\d+$/.test(error.property)
      ? `${parent}[${error.property}]`
      : parent
        ? `${parent}.${error.property}`
        : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}
