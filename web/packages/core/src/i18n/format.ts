/**
 * Fills `{name}` placeholders in a translated string: format('Hi, {name}', { name: 'An' }).
 * A placeholder without a value is left as is (visible in review, never a crash). Pure and
 * client-safe. For counts, pick the message with Intl.PluralRules (see plural()).
 */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Plural forms keyed by Intl.PluralRules categories, e.g. { one: '{count} file', other: '{count} files' }
 * (Vietnamese only has `other`). Falls back to `other`.
 */
export function plural(
  locale: string,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  const category = new Intl.PluralRules(locale).select(count);
  return format(forms[category] ?? forms.other, { count });
}
