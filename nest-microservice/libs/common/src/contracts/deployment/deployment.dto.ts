import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination.dto';
import { IsOptionalNonNull } from '../../dto/validation';
import { DEPLOYMENT_STATUSES, DeploymentStatus } from './deployment.types';

/*
 * HTTP input of the deployment-service REST API, validated by its global ValidationPipe
 * (whitelist + forbidNonWhitelisted). KrakenD forwards the body as-is and validates nothing.
 *
 * Optional fields of NOT NULL columns use @IsOptionalNonNull(): they may be omitted, never null
 * (null → 400). Only nullable columns (description) use @IsOptional(), where null clears them.
 */

export class CreateDeploymentDto {
  @ApiProperty({ example: 'checkout-api', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '1.4.0', maxLength: 50 })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+([-+][\w.]+)?$/, { message: 'version must be semver, e.g. 1.4.0' })
  @MaxLength(50)
  version: string;

  @ApiPropertyOptional({ example: 'production', default: 'development', maxLength: 30 })
  @IsOptionalNonNull()
  @IsString()
  @MaxLength(30)
  environment?: string;

  @ApiPropertyOptional({ enum: DEPLOYMENT_STATUSES, default: 'pending' })
  @IsOptionalNonNull()
  @IsIn(DEPLOYMENT_STATUSES)
  status?: DeploymentStatus;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 10,
    description:
      'Files to attach (POST /api/files/uploads with purpose deployment-attachment, then complete). ' +
      'Each must be yours, uploaded and not attached elsewhere.',
  })
  @IsOptionalNonNull()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  attachmentIds?: string[];
}

/**
 * PATCH body (JSON merge semantics): only the fields present are changed; `description: null`
 * clears the description; null for any other field is a 400.
 * Declared explicitly, NOT with PartialType(CreateDeploymentDto): PartialType adds @IsOptional()
 * to every field, which would let `{ "name": null }` through to the database (500).
 */
export class UpdateDeploymentDto {
  @ApiPropertyOptional({ example: 'checkout-api', maxLength: 100 })
  @IsOptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '1.4.0', maxLength: 50 })
  @IsOptionalNonNull()
  @IsString()
  @Matches(/^\d+\.\d+\.\d+([-+][\w.]+)?$/, { message: 'version must be semver, e.g. 1.4.0' })
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({ example: 'production', maxLength: 30 })
  @IsOptionalNonNull()
  @IsString()
  @MaxLength(30)
  environment?: string;

  @ApiPropertyOptional({ enum: DEPLOYMENT_STATUSES })
  @IsOptionalNonNull()
  @IsIn(DEPLOYMENT_STATUSES)
  status?: DeploymentStatus;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class ListDeploymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on name or version' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  environment?: string;
}
