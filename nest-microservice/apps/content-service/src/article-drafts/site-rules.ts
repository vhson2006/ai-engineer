/**
 * Rules an AI article of a site must follow (ADR 0041), in English, given to the model in both
 * steps. Sites without an entry follow the general rules of the instructions only.
 */
export const ARTICLE_SITE_RULES: Record<string, string[]> = {
  // Alcohol (Vietnamese law on advertising alcohol; the site is 18+ only).
  wine: [
    'The site sells alcohol to adults only: address readers aged 18 and over, never minors.',
    'Never claim alcohol is good for health, never encourage drinking a lot or often, never link drinking to success, driving or sport.',
    'Mention drinking responsibly where it fits, and never drinking and driving.',
    'No prices, discounts or promotions for alcohol.',
  ],
};

export function rulesFor(siteId: string): string[] {
  return ARTICLE_SITE_RULES[siteId] ?? [];
}

/** Sites whose articles never quote prices (their price list isn't even given to the model). */
export const NO_PRICES_SITES = ['wine'];
