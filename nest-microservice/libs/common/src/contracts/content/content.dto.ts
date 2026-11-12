import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination.dto';
import { IsOptionalNonNull } from '../../dto/validation';
import {
  ARTICLE_STATUSES,
  type ArticleStatus,
  LOCALE_PATTERN,
  SLUG_PATTERN,
} from './content.types';

/*
 * HTTP input of content-service, validated by its global ValidationPipe (whitelist +
 * forbidNonWhitelisted). Rules that need data (locales of the site, category of the site, every
 * language before publishing) are checked by the service.
 *
 * `translations` in an update REPLACES the whole set: languages left out are removed.
 */

const LOCALE_MESSAGE = 'must be a language code such as vi, en or en-US';
const SLUG_MESSAGE = 'must be lowercase letters and digits joined by hyphens';

// ─────────────────────────────── Sites ───────────────────────────────

export class CreateSiteDto {
  @ApiProperty({ example: 'nails', maxLength: 50, description: 'Stable id, used in every URL' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: `id ${SLUG_MESSAGE}` })
  @MaxLength(50)
  id: string;

  @ApiProperty({ example: 'Envy Nails Spa of Wendell', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: ['en', 'vi'], description: 'Every language the site publishes in' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @Matches(LOCALE_PATTERN, { each: true, message: `each locale ${LOCALE_MESSAGE}` })
  locales: string[];

  @ApiProperty({ example: 'en', description: 'One of `locales`' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `defaultLocale ${LOCALE_MESSAGE}` })
  defaultLocale: string;
}

export class UpdateSiteDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: ['en', 'vi'] })
  @IsOptionalNonNull()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @Matches(LOCALE_PATTERN, { each: true, message: `each locale ${LOCALE_MESSAGE}` })
  locales?: string[];

  @ApiPropertyOptional({ example: 'en' })
  @IsOptionalNonNull()
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `defaultLocale ${LOCALE_MESSAGE}` })
  defaultLocale?: string;
}

// ─────────────────────────────── Categories ───────────────────────────────

export class CategoryTranslationDto {
  @ApiProperty({ example: 'vi' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `locale ${LOCALE_MESSAGE}` })
  locale: string;

  @ApiProperty({ example: 'Chăm sóc móng', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'cham-soc-mong',
    maxLength: 100,
    description: 'URL segment in this language',
  })
  @IsString()
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  @MaxLength(100)
  slug: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'care', maxLength: 50, description: 'Stable key within the site' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: `key ${SLUG_MESSAGE}` })
  @MaxLength(50)
  key: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1000, description: 'Display order' })
  @IsOptionalNonNull()
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;

  @ApiProperty({ type: [CategoryTranslationDto], description: 'One per language of the site' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations: CategoryTranslationDto[];
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptionalNonNull()
  @IsString()
  @Matches(SLUG_PATTERN, { message: `key ${SLUG_MESSAGE}` })
  @MaxLength(50)
  key?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000 })
  @IsOptionalNonNull()
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;

  @ApiPropertyOptional({ type: [CategoryTranslationDto], description: 'Replaces every language' })
  @IsOptionalNonNull()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations?: CategoryTranslationDto[];
}

// ─────────────────────────────── Articles ───────────────────────────────

/** Upper bound of one body's HTML (about 30 000 words of formatted text). */
export const ARTICLE_HTML_MAX_LENGTH = 200_000;

export class ArticleTranslationDto {
  @ApiProperty({ example: 'vi' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `locale ${LOCALE_MESSAGE}` })
  locale: string;

  @ApiProperty({ example: 'Năm thói quen giúp bộ móng bền lâu', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'nam-thoi-quen-giup-mong-ben-lau',
    maxLength: 150,
    description: 'URL in this language; unique per site and language',
  })
  @IsString()
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  @MaxLength(150)
  slug: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  excerpt: string;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverAlt?: string | null;

  @ApiProperty({
    maxLength: ARTICLE_HTML_MAX_LENGTH,
    description: 'HTML from the editor; sanitized by the service (allow-list ARTICLE_HTML_TAGS)',
    example: '<p>Giữ móng <strong>khô ráo</strong> sau khi rửa tay.</p>',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ARTICLE_HTML_MAX_LENGTH)
  body: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string | null;
}

export class CreateArticleDto {
  @ApiProperty({ description: 'A category of the same site' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptionalNonNull()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Cover image: an uploaded image of the same site (media library); null removes it',
  })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @ApiProperty({
    type: [ArticleTranslationDto],
    description: 'A draft may miss languages; publishing needs every language of the site',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ArticleTranslationDto)
  translations: ArticleTranslationDto[];
}

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsOptionalNonNull()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptionalNonNull()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Cover image: an uploaded image of the same site (media library); null removes it',
  })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @ApiPropertyOptional({ type: [ArticleTranslationDto], description: 'Replaces every language' })
  @IsOptionalNonNull()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ArticleTranslationDto)
  translations?: ArticleTranslationDto[];
}

export class PublishArticleDto {
  @ApiPropertyOptional({
    example: '2026-11-17T01:00:00Z',
    description: 'Omit to publish now; a future time schedules the article',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  at?: string;
}

export class ListArticlesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ARTICLE_STATUSES })
  @IsOptional()
  @IsIn(ARTICLE_STATUSES)
  status?: ArticleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive match on the title (any language)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListPublishedArticlesQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 'vi' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `locale ${LOCALE_MESSAGE}` })
  locale: string;

  @ApiPropertyOptional({ example: 'cham-soc-mong', description: 'Category slug in that language' })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: `category ${SLUG_MESSAGE}` })
  @MaxLength(100)
  category?: string;
}

export class PublishedArticleBySlugQueryDto {
  @ApiProperty({ example: 'vi' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `locale ${LOCALE_MESSAGE}` })
  locale: string;

  @ApiProperty({ example: 'nam-thoi-quen-giup-mong-ben-lau' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  @MaxLength(150)
  slug: string;
}

/** POST …/articles/:id/translations/:locale/auto: machine-translate a language (ADR 0036). */
export class AutoTranslateArticleDto {
  @ApiProperty({ example: 'vi', description: 'The language to translate from (must exist)' })
  @IsString()
  @Matches(LOCALE_PATTERN, { message: `sourceLocale ${LOCALE_MESSAGE}` })
  sourceLocale: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Replace the target language when the article already has it',
  })
  @IsOptionalNonNull()
  @IsBoolean()
  overwrite?: boolean;
}
