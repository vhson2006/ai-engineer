/**
 * Structured data for search engines. A data block, never executed (CSP doesn't apply to it);
 * `<` is escaped so content can't close the script element.
 */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
