import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  addToOutbox,
  assertIfMatch,
  AuthUser,
  CreateDeploymentDto,
  entityTag,
  DEPLOYMENT_EVENTS,
  DEPLOYMENT_ROLES,
  DeploymentCreatedEvent,
  DeploymentResponse,
  DeploymentStatus,
  DeploymentStatusChangedEvent,
  ListDeploymentsQueryDto,
  OutboxRelay,
  paginate,
  Paginated,
  staleResource,
  UpdateDeploymentDto,
} from '@app/common';
import { Deployment, Prisma } from '../generated/prisma/client';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';

/** Soft delete: rows with deleted_at set are invisible to every query below. */
const NOT_DELETED = { deletedAt: null } satisfies Prisma.DeploymentWhereInput;

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly outbox: OutboxRelay,
  ) {}

  async create(dto: CreateDeploymentDto, user: AuthUser): Promise<DeploymentResponse> {
    // No pre-check for duplicates: the unique index is the real guard (race-safe).
    // A violation becomes DatabaseError unique_violation → 409 (PrismaService extension + filter).
    // Attachments are linked in the SAME transaction: an invalid one rolls the deployment back.
    const { attachmentIds = [], ...data } = dto;
    // The event is written to the outbox in the SAME transaction (ADR 0007): committed with the
    // deployment or not at all, then published by the relay (at-least-once).
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.deployment.create({ data: { ...data, createdBy: user.id } });
      await this.files.attach(tx, row.id, attachmentIds, user);
      await addToOutbox(tx, DEPLOYMENT_EVENTS.CREATED, {
        id: row.id,
        name: row.name,
        version: row.version,
        environment: row.environment,
        actorId: user.id,
        occurredAt: new Date().toISOString(),
      } satisfies DeploymentCreatedEvent);
      return row;
    });
    this.outbox.poke(); // publish now rather than at the next poll

    return toResponse(saved);
  }

  async findAll(query: ListDeploymentsQueryDto): Promise<Paginated<DeploymentResponse>> {
    const { page, limit, search, environment } = query;
    const where: Prisma.DeploymentWhereInput = {
      ...NOT_DELETED,
      ...(environment && { environment }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { version: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.deployment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], // id: deterministic tie-break
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return paginate(rows.map(toResponse), total, page, limit);
  }

  async findOne(id: string): Promise<DeploymentResponse> {
    return toResponse(await this.getOrFail(id));
  }

  /**
   * Optimistic concurrency: `ifMatch` must carry the revision the client read (ETag). The write
   * is conditional on that revision, so two concurrent PATCHes can't both win: the second one
   * gets 412 instead of silently overwriting the first (lost update). This also makes
   * `previousStatus` in the event exact.
   */
  async update(
    id: string,
    data: UpdateDeploymentDto,
    user: AuthUser,
    ifMatch: string | undefined,
  ): Promise<DeploymentResponse> {
    const current = await this.getOrFail(id);
    assertCanModify(current, user);
    assertIfMatch(ifMatch, entityTag(current.revision)); // 428 / 412, after 404 / 403

    const saved = await this.prisma.$transaction(async (tx) => {
      const [row] = await tx.deployment.updateManyAndReturn({
        where: { id, revision: current.revision, ...NOT_DELETED },
        data: { ...data, revision: { increment: 1 } },
      });
      if (row && data.status && data.status !== current.status) {
        await addToOutbox(tx, DEPLOYMENT_EVENTS.STATUS_CHANGED, {
          id: row.id,
          previousStatus: current.status as DeploymentStatus,
          status: row.status as DeploymentStatus,
          actorId: user.id,
          occurredAt: new Date().toISOString(),
        } satisfies DeploymentStatusChangedEvent);
      }
      return row;
    });
    if (!saved) {
      // Changed (or deleted) between our read and our write.
      await this.getOrFail(id); // deleted → 404
      throw staleResource(); // changed → 412
    }
    this.outbox.poke();

    return toResponse(saved);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    assertCanModify(await this.getOrFail(id), user);

    const { count } = await this.prisma.deployment.updateMany({
      where: { id, ...NOT_DELETED },
      data: { deletedAt: new Date() },
    });
    if (!count) {
      throw new NotFoundException(`Deployment ${id} not found`); // deleted in between
    }
  }

  private async getOrFail(id: string): Promise<Deployment> {
    const row = await this.prisma.deployment.findFirst({ where: { id, ...NOT_DELETED } });
    if (!row) {
      throw new NotFoundException(`Deployment ${id} not found`);
    }
    return row;
  }
}

/**
 * Ownership rule: admins may change any deployment; everyone else only the ones they created.
 * Rows without a creator (created before authentication existed) are admin-only.
 * The role check (write/admin) already happened in KrakenD and in AuthGuard.
 */
function assertCanModify(row: Deployment, user: AuthUser): void {
  if (user.roles.includes(DEPLOYMENT_ROLES.ADMIN)) {
    return;
  }
  if (row.createdBy === null || row.createdBy !== user.id) {
    throw new ForbiddenException('You can only modify deployments you created');
  }
}

function toResponse(row: Deployment): DeploymentResponse {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    environment: row.environment,
    status: row.status as DeploymentStatus, // varchar column, values guaranteed by the DTOs
    description: row.description,
    createdBy: row.createdBy,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
