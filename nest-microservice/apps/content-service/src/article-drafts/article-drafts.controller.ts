import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  ArticleDraftResponse,
  AuthUser,
  CONTENT_ROLES,
  CreateArticleDraftDto,
  CurrentUser,
  Roles,
  WriteArticleDraftDto,
} from '@app/common';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { ArticleDraftsService } from './article-drafts.service';

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

/**
 * /api/content/sites/{siteId}/article-drafts: articles written by AI (ADR 0041). Reading needs
 * content:read, starting and confirming content:write (or publish/admin). Keep @Roles in sync
 * with KrakenD.
 */
@ApiTags('AI articles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours) or job' })
@Controller('content/sites/:siteId/article-drafts')
export class ArticleDraftsController {
  constructor(private readonly drafts: ArticleDraftsService) {}

  @Post()
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary: 'Start an AI article: the brief and the outline come first (content:write)',
  })
  @ApiCreatedResponse({ description: 'The job, `prompting`: poll it' })
  @ApiUnprocessableEntityResponse({ description: 'invalid_locale, invalid_category' })
  async create(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateArticleDraftDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ArticleDraftResponse> {
    const job = await this.drafts.create(siteId, dto, user);
    setLocation(req, res, job.id);
    return job;
  }

  @Get(':id')
  @Roles(READ)
  @ApiOperation({ summary: 'An AI article job (content:read)' })
  @ApiOkResponse({ description: 'The job' })
  findOne(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleDraftResponse> {
    return this.drafts.findOne(siteId, id, user);
  }

  @Post(':id/write')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary: 'Confirm the brief (as edited): the article is written as a draft (content:write)',
  })
  @ApiAcceptedResponse({ description: 'The job, `writing`: poll it' })
  @ApiConflictResponse({ description: 'busy: no brief to confirm now' })
  @ApiUnprocessableEntityResponse({ description: 'quota_exceeded' })
  write(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WriteArticleDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleDraftResponse> {
    return this.drafts.write(siteId, id, dto, user);
  }
}
