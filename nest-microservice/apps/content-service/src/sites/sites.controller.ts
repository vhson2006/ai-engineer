import { Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AuthUser,
  CONTENT_ROLES,
  CreateSiteDto,
  CurrentUser,
  Roles,
  SiteResponse,
  UpdateSiteDto,
} from '@app/common';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { SitesService } from './sites.service';

const { READ, ADMIN } = CONTENT_ROLES;

/** /api/content/sites. Keep @Roles in sync with the KrakenD endpoints. */
@ApiTags('Sites')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@Controller('content/sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'The sites you manage (content:admin: every site)' })
  @ApiOkResponse({ description: 'Site[]' })
  list(@CurrentUser() user: AuthUser): Promise<SiteResponse[]> {
    return this.sites.list(user);
  }

  @Get(':siteId')
  @Roles(READ)
  @ApiOperation({ summary: 'One site you manage' })
  @ApiOkResponse({ description: 'The site' })
  @ApiNotFoundResponse({ description: 'Unknown site, or not one of yours' })
  findOne(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SiteResponse> {
    return this.sites.findOne(siteId, user);
  }

  @Post()
  @Roles(ADMIN)
  @ApiOperation({ summary: 'Create a site (content:admin)' })
  @ApiCreatedResponse({
    description: 'Created',
    headers: {
      Location: { description: 'URI of the site', schema: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid body, or defaultLocale not in locales' })
  @ApiConflictResponse({ description: 'A site with this id already exists' })
  async create(
    @Body() dto: CreateSiteDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SiteResponse> {
    const site = await this.sites.create(dto);
    setLocation(req, res, site.id);
    return site;
  }

  @Patch(':siteId')
  @Roles(ADMIN)
  @ApiOperation({ summary: 'Change a site: name, languages (content:admin)' })
  @ApiOkResponse({ description: 'The site' })
  @ApiBadRequestResponse({ description: 'Invalid body, or defaultLocale not in locales' })
  @ApiNotFoundResponse({ description: 'Unknown site' })
  update(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SiteResponse> {
    return this.sites.update(siteId, dto, user);
  }
}
