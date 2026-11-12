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
  AuthUser,
  AutoTranslateArticleDto,
  CONTENT_ROLES,
  CurrentUser,
  Roles,
  TranslationJobResponse,
} from '@app/common';
import { ParseLocalePipe } from '../common/pipes/parse-locale.pipe';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { TranslationJobsService } from './translation-jobs.service';

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

/**
 * Machine translation of an article (ADR 0036): asynchronous, 202 + Location of the job. Keep
 * @Roles in sync with the KrakenD endpoints; the rules (draft only, overwrite) are the service's.
 */
@ApiTags('Translations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours), article or job' })
@Controller('content/sites/:siteId/articles/:id')
export class TranslationsController {
  constructor(private readonly jobs: TranslationJobsService) {}

  @Post('translations/:locale/auto')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary:
      'Machine-translate the article into :locale from sourceLocale, as a draft translation to review (content:write)',
  })
  @ApiAcceptedResponse({
    description: 'The translation job (pending)',
    headers: { Location: { description: 'URI of the job', schema: { type: 'string' } } },
  })
  @ApiConflictResponse({ description: 'not_a_draft, or translation_exists without overwrite' })
  @ApiUnprocessableEntityResponse({ description: 'invalid_locale, missing_source or too_large' })
  async start(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', ParseLocalePipe) locale: string,
    @Body() dto: AutoTranslateArticleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TranslationJobResponse> {
    const job = await this.jobs.start(siteId, id, locale, dto, user);
    const article = req.originalUrl.split('?')[0].replace(/\/translations\/[^/]+\/auto\/?$/, '');
    res.location(`${article}/translation-jobs/${encodeURIComponent(job.id)}`);
    return job;
  }

  @Get('translation-jobs')
  @Roles(READ)
  @ApiOperation({
    summary: 'The latest translation jobs of the article, newest first (content:read)',
  })
  @ApiOkResponse({ description: 'Up to 10 jobs' })
  findAll(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TranslationJobResponse[]> {
    return this.jobs.findForArticle(siteId, id, user);
  }

  @Get('translation-jobs/:jobId')
  @Roles(READ)
  @ApiOperation({ summary: 'One translation job (content:read)' })
  @ApiOkResponse({ description: 'The job' })
  findOne(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TranslationJobResponse> {
    return this.jobs.findOne(siteId, id, jobId, user);
  }
}
