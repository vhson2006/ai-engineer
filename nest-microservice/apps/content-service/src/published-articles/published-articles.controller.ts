import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthUser,
  CONTENT_ROLES,
  CurrentUser,
  ListPublishedArticlesQueryDto,
  Paginated,
  PublishedArticleBySlugQueryDto,
  PublishedArticleResponse,
  PublishedArticleSummary,
  Roles,
} from '@app/common';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { PublishedArticlesService } from './published-articles.service';

/**
 * /api/content/sites/{siteId}/published-articles: what a site shows, one language at a time.
 * Read by the sites' servers. Keep @Roles in sync with the KrakenD endpoints.
 */
@ApiTags('Published articles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiBadRequestResponse({ description: 'Invalid query, or a language the site does not have' })
@Controller('content/sites/:siteId/published-articles')
export class PublishedArticlesController {
  constructor(private readonly published: PublishedArticlesService) {}

  @Get()
  @Roles(CONTENT_ROLES.READ)
  @ApiOperation({
    summary: 'Published articles in one language, newest first (optionally one category)',
  })
  @ApiOkResponse({ description: '{ data: PublishedArticleSummary[], meta }' })
  @ApiNotFoundResponse({
    description: 'Unknown site (or not one of yours), or unknown category slug',
  })
  list(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Query() query: ListPublishedArticlesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<PublishedArticleSummary>> {
    return this.published.list(siteId, query, user);
  }

  @Get('by-slug')
  @Roles(CONTENT_ROLES.READ)
  @ApiOperation({
    summary:
      'One published article by its slug in a language. An old slug finds it too: `slug` in the answer is the current one (redirect 301 to it).',
  })
  @ApiOkResponse({ description: 'The article, with its other languages (alternates)' })
  @ApiNotFoundResponse({ description: 'No published article with this slug' })
  bySlug(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Query() query: PublishedArticleBySlugQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PublishedArticleResponse> {
    return this.published.bySlug(siteId, query, user);
  }
}
