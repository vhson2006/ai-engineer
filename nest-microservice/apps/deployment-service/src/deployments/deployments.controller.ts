import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPreconditionFailedResponse,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  AuthUser,
  CreateDeploymentDto,
  CurrentUser,
  DEPLOYMENT_ROLES,
  DeploymentResponse,
  entityTag,
  ListDeploymentsQueryDto,
  Paginated,
  Roles,
  UpdateDeploymentDto,
} from '@app/common';
import { DeploymentsService } from './deployments.service';

const { READ, WRITE, ADMIN } = DEPLOYMENT_ROLES;

const ETAG_HEADER = {
  ETag: {
    description: 'Current revision ("<revision>"): send it back in If-Match to update',
    schema: { type: 'string' },
  },
};

/** ETag = the revision the client must send back in If-Match (optimistic concurrency). */
function withETag(res: Response, deployment: DeploymentResponse): DeploymentResponse {
  res.setHeader('ETag', entityTag(deployment.revision));
  return deployment;
}

/**
 * REST resource /api/deployments, published to clients by KrakenD (k8s/base/krakend/config/krakend.tmpl).
 * HTTP concerns only: routing, validation, roles, status codes, headers, Swagger.
 * Authentication is global (AuthGuard); the ownership rule lives in DeploymentsService.
 * Keep @Roles in sync with the KrakenD endpoints.
 */
@ApiTags('Deployments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token' })
@ApiForbiddenResponse({ description: 'Missing role, or not the creator of the deployment' })
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Post()
  @Roles(WRITE, ADMIN)
  @ApiOperation({ summary: 'Create a deployment (role: deployment:write)' })
  @ApiCreatedResponse({
    description: 'Created',
    headers: {
      Location: { description: 'URI of the new deployment', schema: { type: 'string' } },
      ...ETAG_HEADER,
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiConflictResponse({ description: 'name + version already exists' })
  async create(
    @Body() dto: CreateDeploymentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeploymentResponse> {
    const deployment = await this.deployments.create(dto, user);
    // Same path through KrakenD and direct, because both use the /api prefix.
    const collectionPath = req.originalUrl.split('?')[0].replace(/\/$/, '');
    res.location(`${collectionPath}/${deployment.id}`);
    return withETag(res, deployment); // 201 is the default for POST
  }

  @Get()
  @Roles(READ)
  @ApiOperation({ summary: 'List deployments, paginated (role: deployment:read)' })
  @ApiOkResponse({
    description: '{ data: Deployment[], meta: { page, limit, total, totalPages } }',
  })
  findAll(@Query() query: ListDeploymentsQueryDto): Promise<Paginated<DeploymentResponse>> {
    return this.deployments.findAll(query);
  }

  @Get(':id')
  @Roles(READ)
  @ApiOperation({ summary: 'Get one deployment (role: deployment:read)' })
  @ApiOkResponse({ description: 'The deployment', headers: ETAG_HEADER })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Unknown id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeploymentResponse> {
    return withETag(res, await this.deployments.findOne(id));
  }

  @Patch(':id')
  @Roles(WRITE, ADMIN)
  @ApiOperation({
    summary:
      'Partially update a deployment (deployment:write on your own, deployment:admin on any)',
  })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'The ETag from your last GET (e.g. "3"), or * to skip the check',
  })
  @ApiOkResponse({ description: 'The updated deployment', headers: ETAG_HEADER })
  @ApiBadRequestResponse({ description: 'Invalid body or id' })
  @ApiNotFoundResponse({ description: 'Unknown id' })
  @ApiConflictResponse({ description: 'name + version already exists' })
  @ApiPreconditionFailedResponse({
    description: 'Changed since your GET (If-Match is stale): fetch again and retry',
  })
  @ApiResponse({ status: 428, description: 'If-Match is missing' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeploymentDto,
    @CurrentUser() user: AuthUser,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeploymentResponse> {
    return withETag(res, await this.deployments.update(id, dto, user, ifMatch));
  }

  @Delete(':id')
  @Roles(WRITE, ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a deployment, soft (deployment:write on your own, deployment:admin on any)',
  })
  @ApiNoContentResponse({ description: 'Deleted, no body' })
  @ApiNotFoundResponse({ description: 'Unknown id' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.deployments.remove(id, user);
  }
}
