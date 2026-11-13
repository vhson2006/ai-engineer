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
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
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
  CreateStudioAvatarDto,
  CreateStudioProjectDto,
  CurrentUser,
  ListStudioProjectsQueryDto,
  Paginated,
  Roles,
  STUDIO_TEMPLATES,
  STUDIO_VOICES,
  StudioAvatarResponse,
  StudioBrandKitResponse,
  StudioProjectResponse,
  StudioProjectSummary,
  type StudioTemplate,
  type StudioVoice,
  UpdateStudioAvatarDto,
  UpdateStudioProjectDto,
  UpsertStudioBrandKitDto,
} from '@app/common';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';
import { SitesService } from '../sites/sites.service';
import { AvatarsService } from './avatars.service';
import { BrandKitService } from './brand-kit.service';
import { ProjectsService } from './projects.service';

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

/**
 * /api/content/sites/{siteId}/studio: the video studio of a site (ADR 0039). Reading needs
 * content:read, changing content:write (or publish/admin). Keep @Roles in sync with KrakenD.
 */
@ApiTags('Studio')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours), avatar or project' })
@Controller('content/sites/:siteId/studio')
export class StudioController {
  constructor(
    private readonly sites: SitesService,
    private readonly brand: BrandKitService,
    private readonly avatars: AvatarsService,
    private readonly projects: ProjectsService,
  ) {}

  /* ─────────────── Catalogue ─────────────── */

  @Get('templates')
  @Roles(READ)
  @ApiOperation({
    summary: 'The script templates this site may use, and the voices (content:read)',
  })
  @ApiOkResponse({ description: '{ templates, voices }' })
  async templates(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ templates: StudioTemplate[]; voices: StudioVoice[] }> {
    await this.sites.getAccessible(siteId, user);
    return {
      // Without the facts the site never gets (wine: prices).
      templates: STUDIO_TEMPLATES.filter((t) => !t.excludeSites.includes(siteId)).map((t) => ({
        ...t,
        facts: t.facts.filter((f) => !f.excludeSites?.includes(siteId)),
      })),
      voices: STUDIO_VOICES,
    };
  }

  /* ─────────────── Brand kit ─────────────── */

  @Get('brand')
  @Roles(READ)
  @ApiOperation({
    summary: 'The brand kit (defaults from the site name until saved) (content:read)',
  })
  @ApiOkResponse({ description: 'The brand kit' })
  getBrand(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioBrandKitResponse> {
    return this.brand.get(siteId, user);
  }

  @Put('brand')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Save the brand kit (whole object) (content:write)' })
  @ApiOkResponse({ description: 'The brand kit' })
  @ApiUnprocessableEntityResponse({
    description: 'invalid_media: the logo is not a ready image of the site',
  })
  putBrand(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: UpsertStudioBrandKitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioBrandKitResponse> {
    return this.brand.upsert(siteId, dto, user);
  }

  /* ─────────────── Avatars ─────────────── */

  @Get('avatars')
  @Roles(READ)
  @ApiOperation({ summary: 'The avatars (hosts) of the site (content:read)' })
  @ApiOkResponse({ description: 'Avatar[]' })
  listAvatars(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioAvatarResponse[]> {
    return this.avatars.list(siteId, user);
  }

  @Post('avatars')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Add an avatar: a face, a voice, the consent note (content:write)' })
  @ApiCreatedResponse({ description: 'The avatar' })
  @ApiUnprocessableEntityResponse({ description: 'invalid_media' })
  async createAvatar(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateStudioAvatarDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StudioAvatarResponse> {
    const avatar = await this.avatars.create(siteId, dto, user);
    setLocation(req, res, avatar.id);
    return avatar;
  }

  @Patch('avatars/:id')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Change an avatar (content:write)' })
  @ApiOkResponse({ description: 'The avatar' })
  updateAvatar(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudioAvatarDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioAvatarResponse> {
    return this.avatars.update(siteId, id, dto, user);
  }

  @Delete('avatars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Delete an avatar (content:write)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  removeAvatar(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.avatars.remove(siteId, id, user);
  }

  /* ─────────────── Projects ─────────────── */

  @Get('projects')
  @Roles(READ)
  @ApiOperation({
    summary: 'Video projects, latest first; `rendered=true`: finished videos (content:read)',
  })
  @ApiOkResponse({ description: '{ data: ProjectSummary[], meta }' })
  listProjects(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Query() query: ListStudioProjectsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<StudioProjectSummary>> {
    return this.projects.findAll(siteId, query, user);
  }

  @Post('projects')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Start a video from a template (content:write)' })
  @ApiCreatedResponse({ description: 'The project (draft)' })
  @ApiUnprocessableEntityResponse({
    description: 'invalid_template, invalid_language, invalid_inputs (not of this site)',
  })
  async createProject(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateStudioProjectDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StudioProjectResponse> {
    const project = await this.projects.create(siteId, dto, user);
    setLocation(req, res, project.id);
    return project;
  }

  @Get('projects/:id')
  @Roles(READ)
  @ApiOperation({ summary: 'A project, with its preview props (content:read)' })
  @ApiOkResponse({ description: 'The project' })
  getProject(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioProjectResponse> {
    return this.projects.findOne(siteId, id, user);
  }

  @Patch('projects/:id')
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({
    summary:
      'Change the title, brief, inputs or script; a new script clears the voice (content:write)',
  })
  @ApiOkResponse({ description: 'The project' })
  @ApiConflictResponse({ description: 'busy: a step is in progress' })
  @ApiUnprocessableEntityResponse({ description: 'invalid_inputs, invalid_script' })
  updateProject(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudioProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioProjectResponse> {
    return this.projects.update(siteId, id, dto, user);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Delete a project, its voice and its videos (content:write)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiConflictResponse({ description: 'busy' })
  removeProject(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.projects.remove(siteId, id, user);
  }

  @Post('projects/:id/script')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Let the AI write the script (content:write)' })
  @ApiAcceptedResponse({ description: 'The project, `writing`: poll it' })
  @ApiConflictResponse({ description: 'busy' })
  @ApiUnprocessableEntityResponse({ description: 'missing_input: a required fact' })
  requestScript(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioProjectResponse> {
    return this.projects.requestScript(siteId, id, user);
  }

  @Post('projects/:id/voice')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Speak every line with its voice (content:write)' })
  @ApiAcceptedResponse({ description: 'The project, `voicing`: poll it' })
  @ApiConflictResponse({ description: 'busy' })
  @ApiUnprocessableEntityResponse({ description: 'missing_input: no script' })
  requestVoice(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioProjectResponse> {
    return this.projects.requestVoice(siteId, id, user);
  }

  @Post('projects/:id/render')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(WRITE, PUBLISH, ADMIN)
  @ApiOperation({ summary: 'Render the MP4; counted in the monthly quota (content:write)' })
  @ApiAcceptedResponse({ description: 'The project, `rendering`: poll it' })
  @ApiConflictResponse({ description: 'busy' })
  @ApiUnprocessableEntityResponse({
    description: 'missing_input (script, voice, image, avatar), quota_exceeded',
  })
  requestRender(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudioProjectResponse> {
    return this.projects.requestRender(siteId, id, user);
  }
}
