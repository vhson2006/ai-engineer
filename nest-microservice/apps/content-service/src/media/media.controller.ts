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
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AuthUser,
  CONTENT_ROLES,
  CreateMediaUploadDto,
  CurrentUser,
  GenerateMediaDto,
  MediaGenerationResponse,
  MediaResponse,
  MediaUploadResponse,
  Paginated,
  PaginationQueryDto,
  Roles,
} from '@app/common';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { MediaGenerationService } from './media-generation.service';
import { MediaService } from './media.service';

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

/**
 * /api/content/sites/{siteId}/media: the media library of a site (ADR 0034). The bytes never come
 * here: the browser PUTs them to the presigned URLs, or ai-service writes AI images (ADR 0037). Keep @Roles in sync with the KrakenD endpoints.
 */
@ApiTags('Media')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours), or unknown image' })
@Controller('content/sites/:siteId/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly generations: MediaGenerationService,
  ) {}

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'Uploaded images of a site, newest first (content:read)' })
  @ApiOkResponse({ description: '{ data: Media[], meta }' })
  findAll(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<MediaResponse>> {
    return this.media.findAll(siteId, query, user);
  }

  @Post()
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary:
      'Declare an optimized image and its sizes; answers one presigned PUT per size (content:write)',
  })
  @ApiCreatedResponse({
    description: 'Pending image + upload URLs',
    headers: { Location: { description: 'URI of the image', schema: { type: 'string' } } },
  })
  @ApiBadRequestResponse({ description: 'Invalid body, duplicate widths or mixed ratios' })
  async createUpload(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateMediaUploadDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MediaUploadResponse> {
    const result = await this.media.createUpload(siteId, dto, user);
    setLocation(req, res, result.media.id);
    return result;
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary:
      'Generate 1-4 images from a description with AI (ADR 0037); counted in the monthly quota (content:write)',
  })
  @ApiAcceptedResponse({
    description: 'The job and its pending images; poll the Location until it is not pending',
    headers: { Location: { description: 'URI of the job', schema: { type: 'string' } } },
  })
  @ApiBadRequestResponse({ description: 'Invalid prompt, aspect ratio or count' })
  @ApiUnprocessableEntityResponse({
    description: 'quota_exceeded: the site used its images this month',
  })
  async generate(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: GenerateMediaDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MediaGenerationResponse> {
    const job = await this.generations.generate(siteId, dto, user);
    const media = req.originalUrl.split('?')[0].replace(/\/generate\/?$/, '');
    res.location(`${media}/generations/${encodeURIComponent(job.jobId)}`);
    return job;
  }

  @Get('generations/:jobId')
  @Roles(READ)
  @ApiOperation({ summary: 'An AI image generation and its images (content:read)' })
  @ApiOkResponse({
    description: 'The job: pending, completed (some images may have failed) or failed',
  })
  getGeneration(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MediaGenerationResponse> {
    return this.generations.get(siteId, jobId, user);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Check every uploaded size: the image becomes ready (content:write)' })
  @ApiOkResponse({ description: 'The image, ready' })
  @ApiConflictResponse({ description: 'upload_incomplete: a size is not in storage yet' })
  @ApiUnprocessableEntityResponse({
    description: 'upload_mismatch: a size differs from what was declared (image removed)',
  })
  complete(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MediaResponse> {
    return this.media.complete(siteId, id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Delete an image no article uses (content:write)' })
  @ApiNoContentResponse({ description: 'Deleted, with every size' })
  @ApiConflictResponse({
    description: 'media_in_use: a cover or an article body uses it; generation_in_progress',
  })
  async remove(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.media.remove(siteId, id, user);
  }
}
