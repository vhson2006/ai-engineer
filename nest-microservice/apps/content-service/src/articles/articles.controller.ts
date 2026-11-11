import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
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
  ArticleResponse,
  AuthUser,
  CONTENT_ROLES,
  CreateArticleDto,
  CurrentUser,
  ListArticlesQueryDto,
  Paginated,
  PublishArticleDto,
  Roles,
  UpdateArticleDto,
} from '@app/common';
import { ArticlePublishingService } from './article-publishing.service';
import { ArticlesService } from './articles.service';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

/**
 * /api/content/sites/{siteId}/articles: articles as admins manage them (every language, any
 * status). Keep @Roles in sync with the KrakenD endpoints; the site rule and "only content:publish
 * touches what is not a draft" live in ArticlesService, the publishing workflow in
 * ArticlePublishingService.
 */
@ApiTags('Articles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role, or the article is not a draft' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours), or unknown article' })
@Controller('content/sites/:siteId/articles')
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly publishing: ArticlePublishingService,
  ) {}

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'Articles of a site, newest change first (content:read)' })
  @ApiOkResponse({ description: '{ data: Article[], meta }' })
  findAll(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Query() query: ListArticlesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<ArticleResponse>> {
    return this.articles.findAll(siteId, query, user);
  }

  @Get(':id')
  @Roles(READ)
  @ApiOperation({ summary: 'One article, every language (content:read)' })
  @ApiOkResponse({ description: 'The article' })
  findOne(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleResponse> {
    return this.articles.findOne(siteId, id, user);
  }

  @Post()
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Create a draft (content:write)' })
  @ApiCreatedResponse({
    description: 'Created',
    headers: {
      Location: { description: 'URI of the article', schema: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid body, or the same language twice' })
  @ApiConflictResponse({ description: 'A slug is already used on this site in that language' })
  @ApiUnprocessableEntityResponse({
    description: 'categoryId is not a category of this site, or a language the site does not have',
  })
  async create(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ArticleResponse> {
    const article = await this.articles.create(siteId, dto, user);
    setLocation(req, res, article.id);
    return article;
  }

  @Patch(':id')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary:
      'Change an article; translations replace every language (drafts: content:write; otherwise content:publish)',
  })
  @ApiOkResponse({ description: 'The article' })
  @ApiBadRequestResponse({ description: 'Invalid body, or the same language twice' })
  @ApiConflictResponse({ description: 'A slug is already used on this site in that language' })
  @ApiUnprocessableEntityResponse({
    description:
      'Unknown category, a language the site does not have, or a live/scheduled article would miss a language',
  })
  update(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleResponse> {
    return this.articles.update(siteId, id, dto, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(PUBLISH, ADMIN)
  @ApiOperation({
    summary: 'Publish now, or schedule with `at` (content:publish). Needs every language.',
  })
  @ApiOkResponse({ description: 'The article (published or scheduled)' })
  @ApiConflictResponse({ description: 'Already published: unpublish before scheduling' })
  @ApiUnprocessableEntityResponse({ description: 'A language of the site is missing' })
  publish(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleResponse> {
    return this.publishing.publish(siteId, id, dto, user);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @Roles(PUBLISH, ADMIN)
  @ApiOperation({
    summary: 'Take off the site or cancel a schedule: back to draft (content:publish)',
  })
  @ApiOkResponse({ description: 'The article, now a draft' })
  unpublish(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleResponse> {
    return this.publishing.unpublish(siteId, id, user);
  }

  @Delete(':id')
  @Roles(WRITE, PUBLISH, ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete for good (drafts: content:write; otherwise content:publish)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  async remove(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.articles.remove(siteId, id, user);
  }
}
