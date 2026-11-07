import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination.dto';
import { IsOptionalNonNull } from '../../dto/validation';
import { FILE_PURPOSE_NAMES, FilePurpose, MAX_UPLOAD_BYTES } from './file.purposes';

/**
 * POST /api/files/uploads. The per-purpose rules (content type, size) are checked by the service
 * against FILE_PURPOSES; these are only the global bounds.
 */
export class CreateUploadDto {
  @ApiProperty({ enum: FILE_PURPOSE_NAMES, example: 'deployment-attachment' })
  @IsIn(FILE_PURPOSE_NAMES)
  purpose: FilePurpose;

  @ApiProperty({ example: 'release-notes.pdf', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ example: 'application/pdf', maxLength: 127 })
  @IsString()
  @MaxLength(127)
  @Matches(/^[\w.+-]+\/[\w.+-]+$/, { message: 'contentType must be a media type like image/png' })
  contentType: string;

  @ApiProperty({ example: 48213, description: 'Exact size in bytes', maximum: MAX_UPLOAD_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  size: number;
}

export class ListFilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Files attached to this deployment. Without it: your own files.',
  })
  @IsOptionalNonNull()
  @IsUUID()
  deploymentId?: string;

  @ApiPropertyOptional({ enum: FILE_PURPOSE_NAMES })
  @IsOptionalNonNull()
  @Type(() => String)
  @IsIn(FILE_PURPOSE_NAMES)
  purpose?: FilePurpose;
}

export const DOWNLOAD_DISPOSITIONS = ['attachment', 'inline'] as const;
export type DownloadDisposition = (typeof DOWNLOAD_DISPOSITIONS)[number];

/** GET /api/files/:id/download-url */
export class DownloadLinkQueryDto {
  @ApiPropertyOptional({
    enum: DOWNLOAD_DISPOSITIONS,
    default: 'attachment',
    description: 'attachment: save the file · inline: display it in the browser (images, PDF)',
  })
  @IsOptionalNonNull()
  @IsIn(DOWNLOAD_DISPOSITIONS)
  disposition?: DownloadDisposition;
}
