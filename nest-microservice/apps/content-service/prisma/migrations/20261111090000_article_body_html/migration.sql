-- Article bodies become HTML sanitized by the service (ADR 0031). Existing bodies (blocks
-- [{type: p|h2|quote, text} | {type: list, items}]) are converted, their text HTML-escaped.
ALTER TABLE "article_translations" ADD COLUMN "body_html" TEXT;

UPDATE "article_translations" t SET "body_html" = COALESCE((
  SELECT string_agg(
    CASE e.b->>'type'
      WHEN 'h2' THEN '<h2>' || replace(replace(replace(e.b->>'text', '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</h2>'
      WHEN 'quote' THEN '<blockquote><p>' || replace(replace(replace(e.b->>'text', '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p></blockquote>'
      WHEN 'list' THEN '<ul>' || COALESCE((
        SELECT string_agg('<li>' || replace(replace(replace(i.item, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</li>', '' ORDER BY i.n)
        FROM jsonb_array_elements_text(e.b->'items') WITH ORDINALITY AS i(item, n)), '') || '</ul>'
      ELSE '<p>' || replace(replace(replace(COALESCE(e.b->>'text', ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>'
    END, '' ORDER BY e.n)
  FROM jsonb_array_elements(t."body") WITH ORDINALITY AS e(b, n)
), '');

ALTER TABLE "article_translations" ALTER COLUMN "body_html" SET NOT NULL;
ALTER TABLE "article_translations" DROP COLUMN "body";
ALTER TABLE "article_translations" RENAME COLUMN "body_html" TO "body";
