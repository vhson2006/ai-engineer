import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AuthUser,
  CreateUploadDto,
  DownloadDisposition,
  DownloadLinkResponse,
  DEPLOYMENT_ROLES,
  EXTENSIONS,
  FieldError,
  FILE_PURPOSES,
  FilePurpose,
  FileResponse,
  FileStatus,
  FileVisibility,
  ListFilesQueryDto,
  OBJECT_STORAGE,
  ObjectStorage,
  paginate,
  Paginated,
  UploadSessionResponse,
  ValidationProblemException,
} from '@app/common';
import { Prisma, StoredFile } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Statuses visible through the API; deleting/deleted rows only exist for the cleanup job. */
const LIVE: Prisma.StoredFileWhereInput = { status: { in: ['pending', 'uploaded'] } };

/**
 * Files: metadata in Postgres (table `files`), bytes in object storage (OBJECT_STORAGE).
 *
 *   1. createUpload   validates against FILE_PURPOSES, stores a `pending` row, returns a
 *                     presigned PUT (the browser uploads straight to the bucket)
 *   2. complete       HEAD on the stored object: exists, same size, same type → `uploaded`;
 *                     anything else → the object is deleted and the call fails (422)
 *   3. attach         DeploymentsService links uploaded files to a deployment, in its transaction
 *   4. remove         `deleting` + object deletion; FilesCleanupService retries failures and
 *                     purges expired uploads and orphans
 *
 * Read access: owner and admins always; public files and files attached to a (live) deployment:
 * any reader. Everything else answers 404, so private files of others aren't even revealed.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async createUpload(dto: CreateUploadDto, user: AuthUser): Promise<UploadSessionResponse> {
    const policy = FILE_PURPOSES[dto.purpose];
    const contentType = dto.contentType.toLowerCase();
    assertAllowed(dto.purpose, contentType, dto.size);

    const id = randomUUID();
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const row = await this.prisma.storedFile.create({
      data: {
        id,
        purpose: dto.purpose,
        visibility: policy.visibility,
        storageKey: `${dto.purpose}/${now.getUTCFullYear()}/${month}/${id}.${EXTENSIONS[contentType]}`,
        originalName: sanitizeFilename(dto.filename),
        contentType,
        size: dto.size,
        ownerId: user.id,
      },
    });

    const upload = await this.storage.createUploadUrl({
      visibility: policy.visibility,
      key: row.storageKey,
      contentType,
      size: dto.size,
    });
    return { file: await this.toResponse(row), upload };
  }

  async complete(id: string, user: AuthUser): Promise<FileResponse> {
    const file = await this.getLive(id);
    if (!isOwnerOrAdmin(file, user)) throw notFound(id);
    if (file.status === 'uploaded') return this.toResponse(file); // idempotent

    const stored = await this.storage.stat(file.visibility as FileVisibility, file.storageKey);
    if (!stored) {
      throw new ConflictException({
        message: 'The file has not been uploaded yet (or the upload URL expired)',
        code: 'upload_incomplete',
      });
    }
    if (stored.size !== file.size || mediaType(stored.contentType) !== file.contentType) {
      // Something else than what was declared and validated: never keep it.
      await this.storage.delete(file.visibility as FileVisibility, file.storageKey);
      await this.prisma.storedFile.update({
        where: { id },
        data: { status: 'deleted', deletedAt: new Date() },
      });
      throw new UnprocessableEntityException({
        message: 'The uploaded file does not match the declared size or content type',
        code: 'upload_mismatch',
      });
    }

    // Conditional update: two concurrent completions can't both "win".
    await this.prisma.storedFile.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'uploaded', uploadedAt: new Date() },
    });
    return this.toResponse(await this.getLive(id));
  }

  async findOne(id: string, user: AuthUser): Promise<FileResponse> {
    const file = await this.getLive(id);
    if (!(await this.canRead(file, user))) throw notFound(id);
    return this.toResponse(file);
  }

  /**
   * A short-lived link to the bytes, for whoever may read the file (same rules as findOne).
   * Not uploaded yet → 409 upload_incomplete (only its owner/admins can even see it).
   */
  async downloadLink(
    id: string,
    user: AuthUser,
    disposition: DownloadDisposition = 'attachment',
  ): Promise<DownloadLinkResponse> {
    const file = await this.getLive(id);
    if (!(await this.canRead(file, user))) throw notFound(id);
    if (file.status !== 'uploaded') {
      throw new ConflictException({
        message: 'The file has not been uploaded yet',
        code: 'upload_incomplete',
      });
    }

    const base = {
      filename: file.originalName,
      contentType: file.contentType,
      size: file.size,
    };
    if (file.visibility === 'public') {
      // Served by the CDN as-is (displayed inline); no signature, no expiry.
      return { url: this.storage.publicUrl(file.storageKey), expiresAt: null, ...base };
    }
    const link = await this.storage.createDownloadUrl({
      key: file.storageKey,
      filename: file.originalName,
      contentType: file.contentType,
      inline: disposition === 'inline',
    });
    return { url: link.url, expiresAt: link.expiresAt, ...base };
  }

  async findAll(query: ListFilesQueryDto, user: AuthUser): Promise<Paginated<FileResponse>> {
    const { page, limit, deploymentId, purpose } = query;
    let where: Prisma.StoredFileWhereInput;
    if (deploymentId) {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: deploymentId, deletedAt: null },
        select: { id: true },
      });
      if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);
      where = { deploymentId, status: 'uploaded' }; // attachments: readable by every reader
    } else {
      where = { ...LIVE, ownerId: user.id }; // my files, including pending uploads
    }
    if (purpose) where.purpose = purpose;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.storedFile.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.storedFile.count({ where }),
    ]);
    return paginate(await Promise.all(rows.map((r) => this.toResponse(r))), total, page, limit);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const file = await this.getLive(id);
    if (!isOwnerOrAdmin(file, user)) throw notFound(id);

    const { count } = await this.prisma.storedFile.updateMany({
      where: { id, ...LIVE },
      data: { status: 'deleting', deletedAt: new Date(), deploymentId: null },
    });
    if (!count) throw notFound(id); // deleted in between
    await this.purge(file);
  }

  /**
   * Links uploaded files to a deployment, inside the caller's transaction. All or nothing: each
   * file must belong to the user, be uploaded, be a deployment attachment and not be attached
   * yet (the condition is part of the UPDATE, so two requests can't attach the same file).
   */
  async attach(
    tx: Prisma.TransactionClient,
    deploymentId: string,
    fileIds: string[],
    user: AuthUser,
  ): Promise<void> {
    if (!fileIds.length) return;
    const { count } = await tx.storedFile.updateMany({
      where: {
        id: { in: fileIds },
        ownerId: user.id,
        status: 'uploaded',
        purpose: 'deployment-attachment',
        deploymentId: null,
      },
      data: { deploymentId },
    });
    if (count !== fileIds.length) {
      throw new UnprocessableEntityException({
        message:
          'Every attachment must be a deployment-attachment you uploaded, completed, and not attached elsewhere',
        code: 'invalid_attachments',
      });
    }
  }

  /** Deletes the object, then marks the row deleted. On failure the cleanup job retries. */
  async purge(file: Pick<StoredFile, 'id' | 'visibility' | 'storageKey'>): Promise<boolean> {
    try {
      await this.storage.delete(file.visibility as FileVisibility, file.storageKey);
      await this.prisma.storedFile.update({ where: { id: file.id }, data: { status: 'deleted' } });
      return true;
    } catch (error) {
      this.logger.warn(
        `Object of file ${file.id} not deleted yet, will retry: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async getLive(id: string): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findFirst({ where: { id, ...LIVE } });
    if (!file) throw notFound(id);
    return file;
  }

  private async canRead(file: StoredFile, user: AuthUser): Promise<boolean> {
    if (isOwnerOrAdmin(file, user)) return true;
    if (file.status !== 'uploaded') return false;
    if (file.visibility === 'public') return true;
    if (!file.deploymentId) return false;
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: file.deploymentId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(deployment);
  }

  private async toResponse(row: StoredFile): Promise<FileResponse> {
    let url: string | null = null;
    let urlExpiresAt: string | null = null;
    if (row.status === 'uploaded') {
      if (row.visibility === 'public') {
        url = this.storage.publicUrl(row.storageKey);
      } else {
        const download = await this.storage.createDownloadUrl({
          key: row.storageKey,
          filename: row.originalName,
          contentType: row.contentType,
        });
        url = download.url;
        urlExpiresAt = download.expiresAt;
      }
    }
    return {
      id: row.id,
      purpose: row.purpose as FilePurpose,
      visibility: row.visibility as FileVisibility,
      status: row.status as FileStatus,
      originalName: row.originalName,
      contentType: row.contentType,
      size: row.size,
      ownerId: row.ownerId,
      deploymentId: row.deploymentId,
      createdAt: row.createdAt.toISOString(),
      uploadedAt: row.uploadedAt?.toISOString() ?? null,
      url,
      urlExpiresAt,
    };
  }
}

function assertAllowed(purpose: FilePurpose, contentType: string, size: number): void {
  const policy = FILE_PURPOSES[purpose];
  const errors: FieldError[] = [];
  if (!(policy.contentTypes as readonly string[]).includes(contentType)) {
    errors.push({
      field: 'contentType',
      message: `contentType must be one of: ${policy.contentTypes.join(', ')} for ${purpose}`,
    });
  }
  if (size > policy.maxBytes) {
    errors.push({
      field: 'size',
      message: `size must not be greater than ${policy.maxBytes} bytes for ${purpose}`,
    });
  }
  if (errors.length) throw new ValidationProblemException(errors);
}

function isOwnerOrAdmin(file: StoredFile, user: AuthUser): boolean {
  return file.ownerId === user.id || user.roles.includes(DEPLOYMENT_ROLES.ADMIN);
}

function notFound(id: string): NotFoundException {
  return new NotFoundException(`File ${id} not found`);
}

/** "image/png; charset=binary" → "image/png". */
function mediaType(value: string | undefined): string | undefined {
  return value?.split(';')[0].trim().toLowerCase();
}

/**
 * Keeps only a harmless display name: no directories, no control characters, no leading dots,
 * at most 255 characters. It is never used to build a path or a key.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  return (cleaned || 'file').slice(0, 255);
}
