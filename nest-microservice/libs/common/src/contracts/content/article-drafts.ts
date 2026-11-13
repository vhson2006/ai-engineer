import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ARTICLE_LENGTHS,
  ARTICLE_MAX_IMAGES,
  ARTICLE_MAX_OUTLINE,
  ARTICLE_PROMPT_MAX_LENGTH,
  type ArticleLength,
} from '../ai/article.events';
import { LOCALE_PATTERN } from './content.types';

/*
 * Articles written by AI (ADR 0041): /api/content/sites/{siteId}/article-drafts.
 *
 *   prompting → prompted (the admin edits the brief and the outline) → writing → illustrating
 *   (its AI images) → completed (a DRAFT article in that language; translation jobs into the site's others) | failed
 */
export const ARTICLE_DRAFT_STATUSES = [
  'prompting',
  'prompted',
  'writing',
  'illustrating',
  'completed',
  'failed',
] as const;
export type ArticleDraftStatus = (typeof ARTICLE_DRAFT_STATUSES)[number];

export class CreateArticleDraftDto {
  @ApiProperty({ description: 'The topic (a category of the site)' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'vi', description: 'The language it is written in (one of the site)' })
  @Matches(LOCALE_PATTERN)
  locale: string;

  @ApiProperty({ example: 'Cách giữ móng gel bền 3 tuần', minLength: 3, maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  idea: string;

  @ApiPropertyOptional({ example: 'Phụ nữ đi làm, 25–45 tuổi', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  audience?: string;

  @ApiPropertyOptional({ example: 'giữ móng gel bền', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;

  @ApiProperty({ enum: ARTICLE_LENGTHS })
  @IsIn(ARTICLE_LENGTHS)
  length: ArticleLength;

  @ApiProperty({
    minimum: 0,
    maximum: ARTICLE_MAX_IMAGES,
    description: 'AI images: the cover first',
  })
  @IsInt()
  @Min(0)
  @Max(ARTICLE_MAX_IMAGES)
  images: number;
}

export class WriteArticleDraftDto {
  @ApiProperty({ description: 'The brief, as edited', maxLength: ARTICLE_PROMPT_MAX_LENGTH })
  @IsString()
  @MinLength(50)
  @MaxLength(ARTICLE_PROMPT_MAX_LENGTH)
  prompt: string;

  @ApiProperty({ type: [String], maxItems: ARTICLE_MAX_OUTLINE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ARTICLE_MAX_OUTLINE)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  outline: string[];
}

export interface ArticleDraftResponse {
  id: string;
  siteId: string;
  categoryId: string;
  locale: string;
  idea: {
    topic: string;
    idea: string;
    audience?: string;
    keyword?: string;
    length: ArticleLength;
    images: number;
  };
  status: ArticleDraftStatus;
  prompt: string | null;
  outline: string[];
  /** completed: the draft article (open it in the editor). */
  articleId: string | null;
  /** Numbers found in no fact (check them), and steps skipped (e.g. images_quota). */
  warnings: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
