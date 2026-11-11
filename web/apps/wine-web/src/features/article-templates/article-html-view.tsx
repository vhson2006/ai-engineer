import { cn } from '@web/ui';
import { sanitizeLayoutHtml } from './article-html';
import './article-html.css';

/**
 * An article body in the layout vocabulary. The HTML is sanitized HERE, on the server, with the
 * layout allow-list (article-html.ts) before it is rendered: never raw HTML from elsewhere.
 */
export function ArticleHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn('article-html article-layout', className)} dangerouslySetInnerHTML={{ __html: sanitizeLayoutHtml(html) }} />;
}
