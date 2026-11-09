/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE SITE'S PERSONAL DATA THAT DOESN'T DEPEND ON THE LANGUAGE.
 *
 *  Everything you write in sentences (role, tagline, bio, skills, project,
 *  experience, education, interests) is translated, so it lives in
 *  src/i18n/messages/<language>.json under "profile". Edit it there, in every language.
 *  Projects: src/content/projects.ts. Empty lists hide their section.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const profile = {
  name: 'Văn Hải Sơn',
  initials: 'HS',

  contact: {
    email: 'vhson2006@gmail.com',
    phone: '+84 984 763 100',
    phoneHref: 'tel:+84984763100',
    zaloHref: 'https://zalo.me/0984763100',
    links: [{ label: 'GitHub', href: 'https://github.com/vhson2006' }],
  },

  /** Hero figures (facts from the CV: building software since 2015). */
  stats: { codingSince: 2015, companies: 8 },
} as const;
