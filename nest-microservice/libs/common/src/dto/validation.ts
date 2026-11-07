import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * The property may be OMITTED, but if present it can't be `null`: its other validators run.
 *
 * Use it instead of @IsOptional() for every optional field stored in a NOT NULL column.
 * @IsOptional() skips validation for null too, so `{ "name": null }` would reach the database
 * and fail there (a 500 instead of a 400). Keep @IsOptional() only for nullable columns,
 * where null means "clear the value" (e.g. description).
 *
 * Don't build update DTOs with PartialType(): it adds @IsOptional() to every property, which
 * lets null through again. Declare them explicitly (see UpdateDeploymentDto).
 */
export function IsOptionalNonNull(options?: ValidationOptions): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined, options);
}
