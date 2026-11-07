import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  AuthUser,
  CreateUploadDto,
  CurrentUser,
  DEPLOYMENT_ROLES,
  DownloadLinkQueryDto,
  DownloadLinkResponse,
  FileResponse,
  ListFilesQueryDto,
  Paginated,
  Roles,
  UploadSessionResponse,
} from '@app/common';
import { FilesService } from './files.service';

const { READ, WRITE, ADMIN } = DEPLOYMENT_ROLES;

/**
 * REST resource /api/files (KrakenD: k8s/base/krakend/config/krakend.tmpl). The bytes never go
 * through this API: clients upload to / download from the storage provider with presigned URLs.
 *
 *   POST   /api/files/uploads        → 201 { file, upload: { method, url, headers, expiresAt } }
 *   (client) PUT upload.url with upload.headers and the bytes
 *   POST   /api/files/:id/complete   → 200 file (status uploaded, url)
 *   GET    /api/files/:id            → 200 file with a fresh url
 *   GET    /api/files/:id/download-url?disposition=attachment|inline
 *                                     → 200 { url, expiresAt, filename, contentType, size }
 *          The client sends the browser to `url` (the bytes come from storage, not from us).
 *          Not a 302: KrakenD CE follows redirects itself and would stream the file.
 *   GET    /api/files?deploymentId=  → 200 { data, meta }   (no deploymentId: my files)
 *   DELETE /api/files/:id            → 204
 */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('uploads')
  @Roles(WRITE, ADMIN)
  @ApiOperation({
    summary: 'Start an upload: returns a presigned PUT URL (role: deployment:write)',
  })
  @ApiCreatedResponse({ description: 'File record (pending) + upload instructions' })
  async createUpload(
    @Body() dto: CreateUploadDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UploadSessionResponse> {
    const session = await this.files.createUpload(dto, user);
    const base = req.originalUrl.split('?')[0].replace(/\/uploads\/?$/, '');
    res.location(`${base}/${session.file.id}`);
    return session;
  }

  @Post(':id/complete')
  @Roles(WRITE, ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm the upload; the stored object is verified (owner only)' })
  @ApiOkResponse({ description: 'The file, now uploaded, with its URL' })
  @ApiConflictResponse({ description: 'upload_incomplete: nothing stored yet' })
  @ApiUnprocessableEntityResponse({ description: 'upload_mismatch: size or type differ (deleted)' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FileResponse> {
    return this.files.complete(id, user);
  }

  @Get(':id')
  @Roles(READ)
  @ApiOperation({ summary: 'File metadata and a URL to read it (public CDN or presigned)' })
  @ApiOkResponse({ description: 'The file' })
  @ApiNotFoundResponse({ description: 'Unknown, deleted, or not visible to you' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FileResponse> {
    return this.files.findOne(id, user);
  }

  @Get(':id/download-url')
  @Roles(READ)
  @ApiOperation({
    summary: 'Short-lived link to download (attachment) or display (inline) the file',
  })
  @ApiOkResponse({ description: '{ url, expiresAt, filename, contentType, size }' })
  @ApiNotFoundResponse({ description: 'Unknown, deleted, or not visible to you' })
  @ApiConflictResponse({ description: 'upload_incomplete: not uploaded yet' })
  downloadLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DownloadLinkQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DownloadLinkResponse> {
    return this.files.downloadLink(id, user, query.disposition);
  }

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'Attachments of a deployment (deploymentId), or your own files' })
  @ApiOkResponse({ description: '{ data: File[], meta }' })
  findAll(
    @Query() query: ListFilesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<FileResponse>> {
    return this.files.findAll(query, user);
  }

  @Delete(':id')
  @Roles(WRITE, ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (owner or admin); detaches it from its deployment' })
  @ApiNoContentResponse({ description: 'Deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.files.remove(id, user);
  }
}
