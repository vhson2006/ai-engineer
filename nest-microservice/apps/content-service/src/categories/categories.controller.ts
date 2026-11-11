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
  AuthUser,
  CategoryResponse,
  CONTENT_ROLES,
  CreateCategoryDto,
  CurrentUser,
  Roles,
  UpdateCategoryDto,
} from '@app/common';
import { CategoriesService } from './categories.service';
import { setLocation } from '../common/http/location';
import { ParseSiteIdPipe } from '../common/pipes/parse-site-id.pipe';

const { READ, WRITE, ADMIN } = CONTENT_ROLES;

/** /api/content/sites/{siteId}/categories. Keep @Roles in sync with the KrakenD endpoints. */
@ApiTags('Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role' })
@ApiNotFoundResponse({ description: 'Unknown site (or not one of yours), or unknown category' })
@Controller('content/sites/:siteId/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'Categories of a site, in display order' })
  @ApiOkResponse({ description: 'Category[]' })
  list(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponse[]> {
    return this.categories.list(siteId, user);
  }

  @Get(':id')
  @Roles(READ)
  @ApiOperation({ summary: 'One category' })
  @ApiOkResponse({ description: 'The category' })
  findOne(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponse> {
    return this.categories.findOne(siteId, id, user);
  }

  @Post()
  @Roles(WRITE, ADMIN)
  @ApiOperation({ summary: 'Create a category (content:write)' })
  @ApiCreatedResponse({
    description: 'Created',
    headers: {
      Location: { description: 'URI of the category', schema: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid body, or the same language twice' })
  @ApiConflictResponse({ description: 'Key or slug already used on this site' })
  @ApiUnprocessableEntityResponse({ description: 'A language the site does not have' })
  async create(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CategoryResponse> {
    const category = await this.categories.create(siteId, dto, user);
    setLocation(req, res, category.id);
    return category;
  }

  @Patch(':id')
  @Roles(WRITE, ADMIN)
  @ApiOperation({
    summary: 'Change a category; translations replace every language (content:write)',
  })
  @ApiOkResponse({ description: 'The category' })
  @ApiBadRequestResponse({ description: 'Invalid body, or the same language twice' })
  @ApiConflictResponse({ description: 'Key or slug already used on this site' })
  @ApiUnprocessableEntityResponse({ description: 'A language the site does not have' })
  update(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponse> {
    return this.categories.update(siteId, id, dto, user);
  }

  @Delete(':id')
  @Roles(WRITE, ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category no article uses (content:write)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiUnprocessableEntityResponse({ description: 'Still used by an article' })
  async remove(
    @Param('siteId', ParseSiteIdPipe) siteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.categories.remove(siteId, id, user);
  }
}
