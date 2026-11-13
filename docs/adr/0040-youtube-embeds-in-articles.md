# 0040. YouTube embeds in articles: an id in the body, a click-to-load player on the sites

- **Status:** Accepted, implemented (dev)
- **Date:** 2026-11-12
- **Related:** 0016 (CSP, explicit origins), 0031/0033 (article HTML, layout blocks), 0039 (studio
  clips self-hosted in articles), `libs/common/src/contracts/content/content.types.ts` (`YOUTUBE_ID`),
  `apps/content-service/src/articles/article-html.ts`, `web/packages/ui/src/components/youtube*.tsx`

## Context

Writers want to show their YouTube videos and Shorts in articles of the client sites (nails, wine,
laundry). The studio's own clips are already self-hosted (0039); YouTube adds reach and free
streaming, but an `<iframe>` in user HTML is exactly what the article sanitizer refuses, and a
YouTube player loads about 1 MB of script and Google's tracking on page load.

## Decision

- **An article stores only the video id:** `<figure class="tpl-youtube[ tpl-short]"
  data-youtube="<id>">` + an optional `<figcaption>`. content-service keeps `data-youtube` only as
  an 11-character YouTube id (`YOUTUBE_ID`) and removes a `tpl-youtube` block without one; iframes
  stay forbidden. `tpl-short` = a Shorts video, shown 9:16 (else 16:9).
- **Editor:** "Insert block → YouTube video" adds the block; its card takes any YouTube link
  (watch, youtu.be, shorts, embed, live; `parseYouTubeUrl`) and stores the id and the format.
- **Sites:** `withYouTubeFacades` (server) adds a link to the video (works without JavaScript) with
  its thumbnail (`i.ytimg.com`) and a play icon; `<YouTubeEmbeds />` (client) replaces it with the
  `www.youtube-nocookie.com/embed/<id>?autoplay=1` player on click. Nothing from YouTube but the
  thumbnail loads before that click.
- **CSP** of the three client sites: `frame-src https://www.youtube-nocookie.com` and `img-src
  https://i.ytimg.com` (new `imageOrigins` option of `@web/core/security/headers`), by origin, as
  0016 requires. admin-web doesn't load them (its cards show the link, not the video).
- **Privacy pages** say it: the thumbnail before play; the player and Google's cookies after.

## Consequences

- One more third party on the client sites, only when an article has a video, and only after a
  click for the player.
- Thumbnails are YouTube's 4:3 `hqdefault`, cropped to the block's shape (Shorts: 9:16).
- No structured data (`VideoObject`) for embeds yet: it needs the title, date and duration, which
  only YouTube's API gives.

## Alternatives considered

- **Allowing `<iframe>` from youtube.com in article HTML:** a third-party page in user HTML, the
  player and tracking on every page load. Rejected.
- **Only self-hosted clips (0039):** kept for the studio's videos; YouTube is for videos the site
  already publishes there.
