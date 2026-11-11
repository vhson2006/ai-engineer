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
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  AuthUser,
  CreateDeploymentDto,
  CurrentUser,
  DEPLOYMENT_ROLES,
  DeploymentResponse,
  ListDeploymentsQueryDto,
  Paginated,
  Roles,
  UpdateDeploymentDto,
} from '@app/common';
import { DeploymentsService } from './deployments.service';

const { READ, WRITE, ADMIN } = DEPLOYMENT_ROLES;

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
    return deployment; // 201 is the default for POST
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
  @ApiOkResponse({ description: 'The deployment' })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Unknown id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DeploymentResponse> {
    return this.deployments.findOne(id);
  }

  @Patch(':id')
  @Roles(WRITE, ADMIN)
  @ApiOperation({
    summary:
      'Partially update a deployment (deployment:write on your own, deployment:admin on any)',
  })
  @ApiOkResponse({ description: 'The updated deployment' })
  @ApiBadRequestResponse({ description: 'Invalid body or id' })
  @ApiNotFoundResponse({ description: 'Unknown id' })
  @ApiConflictResponse({ description: 'name + version already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeploymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeploymentResponse> {
    return this.deployments.update(id, dto, user);
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
