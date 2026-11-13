import { withYouTubeFacades } from '@web/ui/youtube';
import { YouTubeEmbeds } from '@web/ui/youtube-embeds';

/**
 * An article's body: HTML from content-service, sanitized there with an allow-list on every write
 * (ADR 0031 text tags + ADR 0033 layout blocks: section/div/figure/img with the fixed `tpl-*`
 * classes). Rendered as is, ONLY for HTML from that API; text styled by `.article-body`
 * (globals.css), blocks by `.article-layout` (@web/ui/article-layout.css). YouTube blocks get their
 * player here (ADR 0040: a thumbnail link, the youtube-nocookie player after a click).
 */
export function ArticleBody({ html, playLabel }: { html: string; playLabel: string }) {
  return (
    <>
      <div className="article-body article-layout" dangerouslySetInnerHTML={{ __html: withYouTubeFacades(html, playLabel) }} />
      <YouTubeEmbeds />
    </>
  );
}
