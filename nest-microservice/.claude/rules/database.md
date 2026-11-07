---
paths:
  - 'apps/**/prisma/**'
  - 'apps/**/prisma.config.ts'
  - 'apps/**/src/prisma/**'
---

# Database rules (Prisma 7 + Postgres)

## Ownership
Each service has its own database and its own Prisma setup:
- `apps/<service>/prisma/schema.prisma`: the models
- `apps/<service>/prisma/migrations/`: the SQL migrations
- `apps/<service>/prisma.config.ts`: CLI config (schema path, migrations path, URL built from DB_* vars)
- `apps/<service>/src/prisma/prisma.service.ts`: runtime client (`@prisma/adapter-pg`, same DB_* vars). Keep it and the config in sync.

The client is generated into `apps/<service>/src/generated/prisma` (git-ignored; `npm install` and `npm run build` regenerate it). Import from `../generated/prisma/client`. No app reads another service's tables or imports another service's client.

## Schema
- `model PascalCase` + `@@map("<plural_snake_case>")`. Fields camelCase in TS, `snake_case` in SQL (`@map("created_at")`).
- Ids: `String @id(map: "pk_<table>") @default(dbgenerated("gen_random_uuid()")) @db.Uuid`.
- Always `createdAt @default(now())` / `updatedAt @default(now()) @updatedAt` as `@db.Timestamptz(6)`.
- Soft delete with `deletedAt DateTime? @db.Timestamptz(6)` when history matters. Prisma doesn't filter it for you: **every query adds `deletedAt: null`** (see `NOT_DELETED` in deployments.service.ts).
- Give explicit native types and lengths (`@db.VarChar(100)`). Declare unique/business invariants with `@@unique(..., map: "uq_<table>_<cols>")`, partial with `where: raw("deleted_at IS NULL")` under soft delete (`partialIndexes` preview feature).
- Shared string unions (e.g. `DeploymentStatus`) stay `varchar` in the DB and are cast in `toResponse`; the DTOs guarantee the values.

## Migrations
- Never `prisma db push` and never change the schema at app startup. Every schema change is a migration.
- Create: edit `schema.prisma`, then `npm run migration:dev -- --name <change_name>` (or `migration:create` to edit the SQL before applying). **Read the generated SQL** before committing.
- Apply (CI/prod/local): `npm run migration:run` (`prisma migrate deploy`).
- Prisma has no `down()`. To roll back, write a new forward migration. Never edit a migration that has already run in a shared environment.

## Queries
- Use Prisma Client, or tagged-template `$queryRaw` for raw SQL. Never `$queryRawUnsafe` with user input.
- List queries: `$transaction([findMany({ where, orderBy, skip, take }), count({ where })])` with a deterministic `orderBy` (add `id` as a tie-break).
- Case-insensitive search: `{ contains: term, mode: 'insensitive' }`.
- Don't do "check then insert" for uniqueness; let the constraint fail (→ 409). Give each unique constraint a DB name (`@@unique(..., map: "uq_...")`) and a public message in `UNIQUE_MESSAGES` (`src/prisma/prisma.service.ts`).

## Errors
- **No try/catch around Prisma calls in services.** `PrismaService` is a PrismaClient extended with `databaseErrors()` (`libs/common/src/database`): every failed call (models, `$queryRaw`, inside `$transaction`) is rethrown as `DatabaseError` with model + operation, and the global filters answer 409 unique / 422 foreign key / 404 not found / 400 invalid value / 409 conflict / 503 timeout or database unavailable / 500 bug, with a generic message.
- Catch only to make a *business* decision (e.g. `if (e instanceof DatabaseError && e.kind === 'not_found') return null`), never to log and rethrow, nor to turn it into a vaguer error.
- A new service with a database creates its client the same way (`createPrismaClient` + `databaseErrors(...)` provided under an abstract `PrismaService` token).
- Keep external calls (HTTP, NATS requests) **outside** `$transaction`.
