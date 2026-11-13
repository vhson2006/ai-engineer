import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxModule } from '../messaging/outbox.module';
import { ArticleService } from './article.service';
import { ARTICLE_AUTHOR, type ArticleAuthor } from './providers/article-author';
import { FakeArticleAuthor } from './providers/fake-article.author';
import { GeminiArticleAuthor } from './providers/gemini-article.author';

/** The author of AI_SCRIPT_PROVIDER: the same text model writes scripts, drafts and articles. */
export function articleAuthor(config: ConfigService): ArticleAuthor {
  switch (config.getOrThrow<string>('AI_SCRIPT_PROVIDER')) {
    case 'gemini':
      return new GeminiArticleAuthor(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeArticleAuthor();
  }
}

/** Articles written by AI (ADR 0041): the brief, then the article as blocks. */
@Module({
  imports: [OutboxModule],
  providers: [
    { provide: ARTICLE_AUTHOR, inject: [ConfigService], useFactory: articleAuthor },
    ArticleService,
  ],
  exports: [ArticleService],
})
export class ArticlesModule {}
