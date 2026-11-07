/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE SITE'S PERSONAL DATA THAT DOESN'T DEPEND ON THE LANGUAGE.
 *
 *  Everything you write in sentences (role, tagline, bio, skills, strengths, project,
 *  experience, education, interests) is translated, so it lives in
 *  src/i18n/messages/<language>.json under "profile". Edit it there, in every language.
 *
 *  Values in «angle quotes» are PLACEHOLDERS: replace them with your real data.
 *  Empty lists hide their section.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const profile = {
  name: '«Your Name»',
  initials: '«YN»',

  contact: {
    email: '«you@example.com»',
    phone: '«+84 …»',
    links: [
      { label: 'GitHub', href: 'https://github.com/«your-username»' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/«your-profile»' },
    ],
  },
} as const;
