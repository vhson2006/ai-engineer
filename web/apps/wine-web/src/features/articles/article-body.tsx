import '@/features/article-templates/article-html.css';

/**
 * An article's body: HTML from content-service, sanitized there with an allow-list on every write
 * (ADR 0031 text tags + ADR 0033 layout blocks: section/div/figure/img with the fixed `tpl-*`
 * classes, the site's own images or its media library). Rendered as is, ONLY for HTML from that
 * API; text styled by `.article-html`, blocks by `.article-layout` (@web/ui/article-layout.css).
 */
export function ArticleBody({ html }: { html: string }) {
  return <div className="article-html article-layout" dangerouslySetInnerHTML={{ __html: html }} />;
}
