---
paths:
  - 'libs/common/**'
---

# Shared contracts rules (`@app/common`)

`libs/common` is the API between apps. Changing it can break a deployed service that hasn't been redeployed yet.

## What belongs here
- `contracts/<resource>/<resource>.dto.ts`: REST input DTO classes (`Create…Dto`, `Update…Dto`, `List…QueryDto extends PaginationQueryDto`).
- File rules live in `contracts/file/file.purposes.ts` (`FILE_PURPOSES`): shared by the DTOs, the service and the cleanup job.
- Optional fields of NOT NULL columns use `@IsOptionalNonNull()` (omitted OK, `null` → 400). `@IsOptional()` only for nullable columns (`null` clears the value). Declare `Update…Dto` field by field: **no `PartialType`**, it adds `@IsOptional()` everywhere and lets `null` reach the database (500).
- `contracts/<resource>/<resource>.types.ts`: response interfaces (`…Response`, dates as ISO strings) and string-union enums (`as const` arrays).
- `contracts/<resource>/<resource>.events.ts`: `<RESOURCE>_EVENTS` subjects (`'<resource>.<past-tense>'`, `as const`) and event payload **classes** with validators.
- Cross-cutting infrastructure: `errors/` (`toProblem`, `ValidationProblemException`, `HttpAllExceptionsFilter`, `RpcAllExceptionsFilter`), `http/` (API middlewares), `database/`, `http-client/`, `nats/`, `dto/pagination.dto.ts`, `constants/`.
- Export everything through the barrel files (`contracts/<resource>/index.ts` → `src/index.ts`).

## What does NOT belong here
- Business logic, repositories, entities, or any import from `apps/*`.
- Anything specific to one app.

## Evolving contracts (backward compatible by default)
- ✅ Add an optional field, add a new route or event, widen a validator.
- ❌ Rename or remove a field, change a type, make an optional field required, or rename an event subject.
- For a breaking event change, add a new subject (`'events.deployment.created.v2'`), migrate the consumers, then remove the old one. For REST, add a new route instead of changing an existing response shape (there's no API versioning).

## Validation
Every field has `class-validator` decorators. Fields exposed in Swagger also have `@ApiProperty`/`@ApiPropertyOptional`. Bound strings with `@MaxLength`, numbers with `@Min`/`@Max`, enums with `@IsIn`.
