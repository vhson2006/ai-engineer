/**
 * An article's body: HTML from content-service, sanitized there with an allow-list on every write
 * (ADR 0031 text tags + ADR 0033 layout blocks: section/div/figure/img with the fixed `tpl-*`
 * classes). Rendered as is, ONLY for HTML from that API; text styled by `.article-body`
 * (globals.css), blocks by `.article-layout` (@web/ui/article-layout.css).
 */
export function ArticleBody({ html }: { html: string }) {
  return <div className="article-body article-layout" dangerouslySetInnerHTML={{ __html: html }} />;
}
