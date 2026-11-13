/** The translation in the first preferred language present, else any (articles, topics). */
export function displayTranslation<X extends { locale: string }>(translations: X[], preferred: string[]): X | undefined {
  for (const locale of preferred) {
    const found = translations.find((t) => t.locale === locale);
    if (found) return found;
  }
  return translations[0];
}
