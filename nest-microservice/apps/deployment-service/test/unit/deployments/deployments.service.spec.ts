import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthUser, DEPLOYMENT_EVENTS, DEPLOYMENT_ROLES, OutboxRelay } from '@app/common';
import type { Deployment } from '../../../src/generated/prisma/client';
import { FilesService } from '../../../src/files/files.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { DeploymentsService } from '../../../src/deployments/deployments.service';

describe('[deployments.service] (unit)', () => {
  let service: DeploymentsService;

  const prisma = {
    deployment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateManyAndReturn: jest.fn(),
      updateMany: jest.fn(),
    },
    outboxMessage: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const outbox = { poke: jest.fn() };
  const files = { attach: jest.fn() };

  const owner: AuthUser = {
    id: 'user-owner',
    roles: [DEPLOYMENT_ROLES.READ, DEPLOYMENT_ROLES.WRITE],
    groups: [],
  };
  const otherDev: AuthUser = {
    id: 'user-other',
    roles: [DEPLOYMENT_ROLES.READ, DEPLOYMENT_ROLES.WRITE],
    groups: [],
  };
  const admin: AuthUser = {
    id: 'user-admin',
    roles: [DEPLOYMENT_ROLES.READ, DEPLOYMENT_ROLES.WRITE, DEPLOYMENT_ROLES.ADMIN],
    groups: [],
  };

  const row = (overrides: Partial<Deployment> = {}): Deployment => ({
    id: '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f',
    name: 'checkout-api',
    version: '1.4.0',
    environment: 'production',
    status: 'pending',
    description: null,
    createdBy: owner.id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    // $transaction: array form resolves the queries; callback form runs with the same mock as tx.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxRelay, useValue: outbox },
        { provide: FilesService, useValue: files },
      ],
    }).compile();

    service = moduleRef.get(DeploymentsService);
  });

  describe('create', () => {
    it('saves the creator, returns the response contract and emits deployments.created', async () => {
      prisma.deployment.create.mockResolvedValue(row());

      const result = await service.create({ name: 'checkout-api', version: '1.4.0' }, owner);

      expect(prisma.deployment.create).toHaveBeenCalledWith({
        data: { name: 'checkout-api', version: '1.4.0', createdBy: owner.id },
      });
      expect(result).toMatchObject({
        id: row().id,
        createdBy: owner.id,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('deletedAt');
      expect(prisma.outboxMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subject: DEPLOYMENT_EVENTS.CREATED,
          payload: expect.objectContaining({
            id: row().id,
            name: 'checkout-api',
            actorId: owner.id,
          }),
        }),
      });
    });

    it('does not emit when the insert fails', async () => {
      prisma.deployment.create.mockRejectedValue(
        Object.assign(new Error('dup'), { name: 'PrismaClientKnownRequestError', code: 'P2002' }),
      );

      await expect(service.create({ name: 'a', version: '1.0.0' }, owner)).rejects.toThrow('dup');
      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('paginates with skip/take, hides soft-deleted rows and returns data + meta', async () => {
      prisma.deployment.findMany.mockResolvedValue([row()]);
      prisma.deployment.count.mockResolvedValue(21);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(prisma.deployment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10, where: { deletedAt: null } }),
      );
      expect(prisma.deployment.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(result.meta).toEqual({ page: 3, limit: 10, total: 21, totalPages: 3 });
    });

    it('searches name OR version case-insensitively within the environment', async () => {
      prisma.deployment.findMany.mockResolvedValue([]);
      prisma.deployment.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, search: 'check', environment: 'production' });

      expect(prisma.deployment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            environment: 'production',
            OR: [
              { name: { contains: 'check', mode: 'insensitive' } },
              { version: { contains: 'check', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for an unknown or soft-deleted id', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.deployment.findFirst).toHaveBeenCalledWith({
        where: { id: 'missing', deletedAt: null },
      });
    });
  });

  describe('update', () => {
    it('lets the creator update and emits status-changed with the actor', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ status: 'pending' }));
      prisma.deployment.updateManyAndReturn.mockResolvedValue([row({ status: 'running' })]);

      await service.update(row().id, { status: 'running' }, owner);

      expect(prisma.deployment.updateManyAndReturn).toHaveBeenCalledWith({
        where: { id: row().id, deletedAt: null },
        data: { status: 'running' },
      });
      expect(prisma.outboxMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subject: DEPLOYMENT_EVENTS.STATUS_CHANGED,
          payload: expect.objectContaining({
            previousStatus: 'pending',
            status: 'running',
            actorId: owner.id,
          }),
        }),
      });
    });

    it('does not emit when the status is unchanged', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateManyAndReturn.mockResolvedValue([row({ description: 'hotfix' })]);

      await service.update(row().id, { description: 'hotfix' }, owner);

      expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
    });

    it("forbids a non-admin from updating someone else's deployment, without writing", async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());

      await expect(
        service.update(row().id, { status: 'running' }, otherDev),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it('lets an admin update anyone’s deployment, including rows without a creator', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ createdBy: null }));
      prisma.deployment.updateManyAndReturn.mockResolvedValue([
        row({ createdBy: null, status: 'running' }),
      ]);

      await service.update(row().id, { status: 'running' }, admin);

      expect(prisma.deployment.updateManyAndReturn).toHaveBeenCalled();
    });

    it('treats rows without a creator as admin-only', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row({ createdBy: null }));

      await expect(service.update(row().id, { status: 'running' }, owner)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFoundException without writing when the id is unknown', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { status: 'running' }, owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.deployment.updateManyAndReturn).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the creator soft-delete a live row', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateMany.mockResolvedValue({ count: 1 });

      await service.remove(row().id, owner);

      expect(prisma.deployment.updateMany).toHaveBeenCalledWith({
        where: { id: row().id, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("forbids a non-admin from deleting someone else's deployment", async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());

      await expect(service.remove(row().id, otherDev)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.deployment.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown id', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);
      await expect(service.remove('missing', owner)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the row was deleted in between', async () => {
      prisma.deployment.findFirst.mockResolvedValue(row());
      prisma.deployment.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.remove(row().id, owner)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
