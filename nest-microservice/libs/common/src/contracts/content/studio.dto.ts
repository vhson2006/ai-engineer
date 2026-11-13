import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination.dto';
import { IsOptionalNonNull } from '../../dto/validation';
import { LOCALE_PATTERN } from './content.types';
import { STUDIO_TEMPLATES, STUDIO_VOICE_IDS } from './studio.templates';

/* Video studio (ADR 0039): REST inputs under /api/content/sites/{siteId}/studio. */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SCENE_ID = /^[a-z][a-z0-9-]{0,39}$/;
export const STUDIO_TEMPLATE_IDS = STUDIO_TEMPLATES.map((template) => template.id);

/** PUT …/studio/brand: the site's brand kit (whole object each time). */
export class UpsertStudioBrandKitDto {
  @ApiProperty({ example: 'Giặt sấy SFaster', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brandName: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string | null;

  @ApiPropertyOptional({ example: '0909 123 456', maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Gọi hoặc nhắn Zalo cho tiệm', maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  callToAction?: string | null;

  @ApiPropertyOptional({ example: 'Thân thiện, câu ngắn', maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tone?: string | null;

  @ApiPropertyOptional({
    description: 'A line always shown on the brand card (wine: the 18+ notice)',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerNote?: string | null;

  @ApiProperty({ type: [String], maxItems: 50, description: 'Words the AI must never use' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  bannedPhrases: string[];

  @ApiProperty({ example: '#13883a' })
  @Matches(HEX_COLOR)
  primaryColor: string;

  @ApiProperty({ example: '#ffd400' })
  @Matches(HEX_COLOR)
  accentColor: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'A ready image of the site' })
  @IsOptional()
  @IsUUID()
  logoMediaId?: string | null;
}

export class CreateStudioAvatarDto {
  @ApiProperty({ example: 'Chị Lan (chủ tiệm)', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ format: 'uuid', description: 'A ready image of the site: the face' })
  @IsUUID()
  mediaId: string;

  @ApiProperty({ enum: STUDIO_VOICE_IDS })
  @IsIn(STUDIO_VOICE_IDS)
  voice: string;

  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    description: 'Who agreed to appear, when and how (or the stock licence)',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  consentNote: string;
}

export class UpdateStudioAvatarDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptionalNonNull()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({ enum: STUDIO_VOICE_IDS })
  @IsOptionalNonNull()
  @IsIn(STUDIO_VOICE_IDS)
  voice?: string;

  @ApiPropertyOptional({ minLength: 10, maxLength: 500 })
  @IsOptionalNonNull()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  consentNote?: string;
}

/**
 * What the admin filled in, by slot id. Shapes are checked here (string maps); the service checks
 * the keys against the template and the values (ids of THIS site, voices, lengths).
 */
export class StudioInputsDto {
  @ApiProperty({ example: { hero: '9b2c…' }, description: 'Image slot id → media id' })
  @IsObject()
  images: Record<string, string>;

  @ApiProperty({ example: { host: '3f1a…' }, description: 'Avatar slot id → avatar id' })
  @IsObject()
  avatars: Record<string, string>;

  @ApiProperty({ example: { narrator: 'Kore' }, description: 'Speaker id → voice id' })
  @IsObject()
  voices: Record<string, string>;

  @ApiProperty({
    example: { price: 'Giặt sấy từ 35.000đ/mẻ' },
    description: 'Fact id → text, or an article id for `article` facts',
  })
  @IsObject()
  facts: Record<string, string>;
}

export class CreateStudioProjectDto {
  @ApiProperty({ enum: STUDIO_TEMPLATE_IDS })
  @IsIn(STUDIO_TEMPLATE_IDS)
  templateId: string;

  @ApiProperty({ example: 'Giá giặt sấy tháng 11', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'vi', description: 'A language of the site' })
  @Matches(LOCALE_PATTERN)
  language: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brief?: string | null;

  @ApiProperty({ type: StudioInputsDto })
  @ValidateNested()
  @Type(() => StudioInputsDto)
  inputs: StudioInputsDto;
}

export class StudioScriptSceneDto {
  @ApiProperty({ example: 'hook' })
  @Matches(SCENE_ID)
  id: string;

  @ApiProperty({ maxLength: 600 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  voice: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  onScreen: string;
}

/** The admin's edit of the AI's script (whole script each time). */
export class StudioScriptDto {
  @ApiProperty({ type: [String], maxItems: 3 })
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(600, { each: true })
  hooks: string[];

  @ApiProperty({ type: [StudioScriptSceneDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => StudioScriptSceneDto)
  scenes: StudioScriptSceneDto[];

  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  caption: string;

  @ApiProperty({ type: [String], maxItems: 15 })
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  hashtags: string[];
}

export class UpdateStudioProjectDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brief?: string | null;

  @ApiPropertyOptional({ type: StudioInputsDto })
  @IsOptionalNonNull()
  @ValidateNested()
  @Type(() => StudioInputsDto)
  inputs?: StudioInputsDto;

  @ApiPropertyOptional({ type: StudioScriptDto })
  @IsOptionalNonNull()
  @ValidateNested()
  @Type(() => StudioScriptDto)
  script?: StudioScriptDto;
}

/** GET …/studio/projects */
export class ListStudioProjectsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only finished videos (the media library Video section)' })
  @IsOptional()
  @IsIn(['true', 'false'])
  rendered?: 'true' | 'false';
}
