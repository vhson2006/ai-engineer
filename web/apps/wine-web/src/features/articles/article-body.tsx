import { withYouTubeFacades } from '@web/ui/youtube';
import { YouTubeEmbeds } from '@web/ui/youtube-embeds';
import '@/features/article-templates/article-html.css';

/**
 * An article's body: HTML from content-service, sanitized there with an allow-list on every write
 * (ADR 0031 text tags + ADR 0033 layout blocks: section/div/figure/img with the fixed `tpl-*`
 * classes, the site's own images or its media library). Rendered as is, ONLY for HTML from that
 * API; text styled by `.article-html`, blocks by `.article-layout` (@web/ui/article-layout.css).
 * YouTube blocks get their player here (ADR 0040: a thumbnail link, the youtube-nocookie player after a click).
 */
export function ArticleBody({ html, playLabel }: { html: string; playLabel: string }) {
  return (
    <>
      <div className="article-html article-layout" dangerouslySetInnerHTML={{ __html: withYouTubeFacades(html, playLabel) }} />
      <YouTubeEmbeds />
    </>
  );
}
