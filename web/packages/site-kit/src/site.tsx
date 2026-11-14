import 'server-only';
import type { Metadata, MetadataRoute } from 'next';
import type { StaticImageData } from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { lang } from 'next/root-params';
import type { ReactElement, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedPageMetadata, localizedSitemap, type PreviewImage } from '@web/core/i18n/seo';
import { Container, buttonClass } from '@web/ui';
import { CoverImage } from '@web/ui/cover-image';
import { JsonLd } from '@web/ui/json-ld';
import { createArticles, type Article, type ArticleCovers } from './articles';
import { mapsHref } from './business';
import { ArticleBody, ArticleGrid, ArticleMeta, ArticlesHeader, FeaturedArticle, TopicChip } from './components/articles';
import { ContactButtons } from './components/chrome';
import { LegalDocument } from './components/legal';
import { ShareBar } from './components/share-bar';
import { href, isLocale, type Locale } from './locales';
import type { BaseMessages } from './messages';
import { cachedCard, OG_SIZE, ogResponse, renderOgCard } from './og';
import type { LegalPage, Website } from './website';

type Size = { width: number; height: number };

export interface SiteConfig<M extends BaseMessages> {
  website: Website;
  /** The public origin (SITE_URL, baked at build: next.config.ts, ADR 0021). */
  siteUrl: string;
  /** The site's dictionary for a language (kit strings merged with the site's own). */
  loadMessages: (locale: Locale) => Promise<M>;
  /**
   * The link preview of every page without its own image (1200×630): a public file, or with
   * `ogCard` the site's card per language (/og/<lang>.png, routes.ogImage).
   */
  defaultImage?: { url: string } & Size;
  /** Draws the site's preview card for a language (src/og-card.tsx). */
  ogCard?: (locale: Locale, t: M) => ReactElement | Promise<ReactElement>;
  /** Draws an article's preview card when it has no cover of its own (routes.articleOgImage). */
  articleOgCard?: (locale: Locale, t: M, article: Article) => ReactElement | Promise<ReactElement>;
  /** Photos of the business for JSON-LD (public paths). */
  schemaImages: string[];
  /** Article covers when the admins chose none (ADR 0034). */
  covers: ArticleCovers;
  /** The article page: a share bar (Facebook, copy link); the call to action under the text (default: contact buttons). */
  article?: { share?: boolean; cta?: (t: M, locale: Locale) => ReactNode };
  /** The legal pages: extra `{placeholders}` of the site's own texts; what to add after the text. */
  legal?: { facts?: Record<string, string>; after?: (t: M, locale: Locale) => ReactNode };
}

/**
 * The one param a dynamic route prerenders when there is nothing to list (Next.js needs at least
 * one with ensureStatic): answered 404 without calling the API, so a build needs no API at all.
 */
const NONE = '__none__';

type SlugParams = { params: Promise<{ slug: string }> };
type TopicParams = { params: Promise<{ category: string }> };
type LangParams = { params: { lang: string } };
type ImageParams = { params: Promise<{ image: string }> };
type ArticleImageParams = { params: Promise<{ lang: string; image: string }> };

/**
 * Everything a business site shares (ADR 0042), bound to ONE site: its locale and dictionary
 * from the [lang] root segment, SEO (metadata, JSON-LD), its articles from content-service, and
 * ready-made routes (articles, topics, an article, legal pages, 404, sitemap, robots, preview
 * cards). The site's route files only re-export them (plus `ensureStatic`, which Next.js reads
 * statically).
 */
export function createSite<M extends BaseMessages>(config: SiteConfig<M>) {
  const { website, siteUrl } = config;
  const { business } = website;
  const siteName = business.siteName ?? business.fullName;
  const articles = createArticles(website, config.covers);

  /** The current page's locale, from the [lang] root segment (next/root-params). Server Components only. */
  async function getLocale(): Promise<Locale> {
    const value = await lang();
    if (!isLocale(value) || !website.locales.includes(value)) notFound();
    return value;
  }

  /** The current page's dictionary. */
  async function getMessages(): Promise<M> {
    return config.loadMessages(await getLocale());
  }

  async function context() {
    const locale = await getLocale();
    return { locale, t: await config.loadMessages(locale) };
  }

  function absoluteUrl(path: string): string {
    return new URL(path, siteUrl).href;
  }

  /** The preview of pages without their own image. */
  function defaultPreview(t: BaseMessages, locale: Locale): PreviewImage {
    const image = config.ogCard ? { url: `/og/${locale}.png`, ...OG_SIZE } : config.defaultImage;
    if (!image) throw new Error(`${business.siteId}: give createSite a defaultImage or an ogCard`);
    return { ...image, alt: t.meta.ogImageAlt };
  }

  /** An article's preview: the cover chosen in the media library, else its card, else the site's. */
  function articlePreview(t: BaseMessages, locale: Locale, article: Article): PreviewImage {
    if (article.cover.kind === 'media') {
      const { url, width, height } = article.cover.image;
      return { url, width, height, alt: article.cover.alt || article.title };
    }
    if (config.articleOgCard) return { url: `/og${website.paths.articles}/${locale}/${article.slug}.png`, ...OG_SIZE, alt: article.title };
    return defaultPreview(t, locale);
  }

  /** Full metadata of a public page (canonical, hreflang, Open Graph, Twitter card; ADR 0021). */
  function pageMetadata({
    t,
    locale,
    paths,
    title,
    description,
    image,
    article,
  }: {
    t: BaseMessages;
    locale: Locale;
    paths: Partial<Record<Locale, string>>;
    /** Omitted on the home page (the layout's default title). */
    title?: string;
    description: string;
    image?: PreviewImage;
    article?: { publishedTime: string };
  }): Metadata {
    return localizedPageMetadata({
      locale,
      intl: website.intlByLocale,
      defaultLocale: website.defaultLocale,
      paths,
      siteName,
      title,
      fullTitle: title ? `${title} · ${siteName}` : t.meta.title,
      description,
      image: image ?? defaultPreview(t, locale),
      article,
    });
  }

  /** The [lang] layout's metadata: the home page's, and every page's defaults. */
  async function layoutMetadata(): Promise<Metadata> {
    const { t, locale } = await context();
    return {
      metadataBase: new URL(siteUrl),
      ...pageMetadata({ t, locale, paths: website.samePath('/'), description: t.meta.description }),
      title: { default: t.meta.title, template: `%s · ${siteName}` },
      applicationName: siteName,
      formatDetection: { telephone: false, address: false, email: false },
    };
  }

  const businessId = () => absoluteUrl('/#business');

  /**
   * schema.org JSON-LD: the website and the business (name, address, phone, hours, map) with
   * stable @ids, plus an Article on an article page. Only facts shown on the site.
   */
  function structuredData(t: BaseMessages, locale: Locale, extra: object[] = []) {
    const { address } = business;
    const home = absoluteUrl(localizedPath(locale, '/'));
    const node = {
      '@type': business.schema.type,
      '@id': businessId(),
      name: business.fullName,
      ...(business.legalName && { legalName: business.legalName }),
      description: t.meta.description,
      url: home,
      image: [defaultPreview(t, locale).url, ...config.schemaImages].map(absoluteUrl),
      logo: absoluteUrl(business.schema.logo ?? '/icon.svg'),
      telephone: business.phone.href.replace('tel:', ''),
      ...(business.email && { email: business.email }),
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.street,
        addressLocality: address.locality ?? address.ward ?? address.city,
        addressRegion: address.region,
        ...(address.postalCode && { postalCode: address.postalCode }),
        addressCountry: address.country ?? 'VN',
      },
      hasMap: mapsHref(business),
      currenciesAccepted: website.currency,
      ...(business.schema.priceRange && { priceRange: business.schema.priceRange }),
      ...(business.hours.length > 0 && {
        openingHoursSpecification: business.hours.map((row) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: row.days.map((day) => `https://schema.org/${day}`),
          opens: row.open,
          closes: row.close,
        })),
      }),
      sameAs: [business.zaloHref, ...(business.socials ?? []).map((social) => social.href)].filter(Boolean),
      ...business.schema.extra,
    };
    const site = {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: home,
      name: siteName,
      inLanguage: website.intl(locale),
      publisher: { '@id': businessId() },
    };
    return { '@context': 'https://schema.org', '@graph': [site, node, ...extra] };
  }

  function articleNode(t: BaseMessages, locale: Locale, article: Article) {
    const url = absoluteUrl(localizedPath(locale, website.paths.article(article.slug)));
    return {
      '@type': 'Article',
      '@id': `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: article.title,
      description: article.excerpt,
      image: absoluteUrl(articlePreview(t, locale, article).url),
      datePublished: article.publishedAt,
      inLanguage: website.intl(locale),
      author: { '@id': businessId() },
      publisher: { '@id': businessId() },
    };
  }

  /** The newest articles for a landing page; none when the API is down (the page never fails for them). */
  async function latestArticles(locale: Locale) {
    return articles.listArticles(locale).catch(() => []);
  }

  /** The default call to action under an article: the business's phone, Zalo and email. */
  function ArticleCta({ t }: { t: M }) {
    return (
      <aside className="article-cta mt-10 rounded-card bg-deep p-8 text-deep-fg sm:p-10">
        <p className="display text-2xl text-accent">{t.blog.ctaTitle}</p>
        <p className="mt-2 text-deep-fg/85">{t.blog.ctaText}</p>
        <div className="mt-6">
          <ContactButtons website={website} t={t} tone="light" />
        </div>
      </aside>
    );
  }

  /** A preview card route: render once per process, 404 for anything else. */
  const cardRoute = <P,>(key: (params: P) => Promise<{ cacheKey: string; render: () => Promise<ReactElement> } | null>) => {
    const rendered = new Map<string, Promise<ArrayBuffer>>();
    return async (params: P) => {
      const found = await key(params);
      if (!found) return new Response(null, { status: 404 });
      return ogResponse(cachedCard(rendered, found.cacheKey, async () => renderOgCard(await found.render())));
    };
  };

  const ogImageHandler = cardRoute(async (image: string) => {
    const locale = image.replace(/\.png$/, '');
    if (!config.ogCard || !image.endsWith('.png') || !isLocale(locale)) return null;
    const draw = config.ogCard;
    return { cacheKey: locale, render: async () => draw(locale, await config.loadMessages(locale)) };
  });

  const articleImageHandler = cardRoute(async ({ lang: code, image }: { lang: string; image: string }) => {
    const slug = image.replace(/\.png$/, '');
    if (!config.articleOgCard || !image.endsWith('.png') || !isLocale(code)) return null;
    const article = await articles.getArticle(code, slug);
    if (!article) return null;
    const draw = config.articleOgCard;
    return { cacheKey: `${code}/${article.id}/${article.title}`, render: async () => draw(code, await config.loadMessages(code), article) };
  });

  const routes = {
    /** The articles index: the featured article as a spread, then the rest, newest first. */
    articlesIndex: {
      async metadata(): Promise<Metadata> {
        const { t, locale } = await context();
        return pageMetadata({ t, locale, paths: website.samePath(website.paths.articles), title: t.blog.metaTitle, description: t.blog.metaDescription });
      },
      async Page() {
        const { t, locale } = await context();
        const [list, topics] = await Promise.all([articles.listArticles(locale), articles.listTopics(locale)]);
        const featured = list.find((article) => article.featured) ?? list[0];
        const rest = list.filter((article) => article !== featured);
        return (
          <>
            <ArticlesHeader title={t.blog.title} intro={t.blog.intro} topics={topics} website={website} locale={locale} t={t} />
            <Container className="space-y-16 py-14 sm:py-20">
              {featured ? (
                <FeaturedArticle article={featured} website={website} locale={locale} t={t} />
              ) : (
                <p className="rounded-card bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.none}</p>
              )}
              {rest.length > 0 && <ArticleGrid articles={rest} website={website} locale={locale} t={t} headingLevel="h2" />}
            </Container>
          </>
        );
      },
    },

    /** A topic's page (a segment of another language redirects). */
    topic: {
      async staticParams({ params }: LangParams) {
        const topics = isLocale(params.lang) ? await articles.listTopics(params.lang) : [];
        // ensureStatic needs at least one entry: an unknown segment, answered by notFound().
        return topics.length ? topics.map((topic) => ({ category: topic.slug })) : [{ category: NONE }];
      },
      async metadata({ params }: TopicParams): Promise<Metadata> {
        const [{ category }, { t, locale }] = await Promise.all([params, context()]);
        if (category === NONE) return {};
        const topic = await articles.topicBySlug(locale, category);
        if (!topic) return {};
        return pageMetadata({
          t,
          locale,
          paths: Object.fromEntries(Object.entries(topic.slugs).map(([code, slug]) => [code, website.paths.topic(slug)])),
          title: format(t.articles.categoryTitle, { category: topic.name }),
          description: format(t.articles.categoryDescription, { category: topic.name.toLowerCase(), name: business.fullName }),
        });
      },
      async Page({ params }: TopicParams) {
        const [{ category }, { t, locale }] = await Promise.all([params, context()]);
        if (category === NONE) notFound();
        const topic = await articles.topicBySlug(locale, category);
        if (!topic) {
          const own = await articles.topicSlugInLocale(locale, category);
          if (own) permanentRedirect(href(locale, website.paths.topic(own)));
          notFound();
        }
        const [list, topics] = await Promise.all([articles.listArticles(locale, topic.slug), articles.listTopics(locale)]);
        return (
          <>
            <ArticlesHeader
              title={format(t.articles.categoryTitle, { category: topic.name })}
              intro={format(t.articles.categoryDescription, { category: topic.name.toLowerCase(), name: business.fullName })}
              active={topic.key}
              topics={topics}
              website={website}
              locale={locale}
              t={t}
            />
            <Container className="py-14 sm:py-20">
              {list.length > 0 ? (
                <ArticleGrid articles={list} website={website} locale={locale} t={t} headingLevel="h2" />
              ) : (
                <p className="rounded-card bg-surface-2 px-6 py-10 text-center text-muted">{t.articles.empty}</p>
              )}
            </Container>
          </>
        );
      },
    },

    /** One article (another language's slug or an old slug redirects, 308). */
    article: {
      async staticParams({ params }: LangParams) {
        const list = isLocale(params.lang) ? await articles.listArticles(params.lang) : [];
        return list.length ? list.map((article) => ({ slug: article.slug })) : [{ slug: NONE }];
      },
      async metadata({ params }: SlugParams): Promise<Metadata> {
        const [{ slug }, { t, locale }] = await Promise.all([params, context()]);
        if (slug === NONE) return {};
        const article = await articles.getArticle(locale, slug);
        if (!article) return {};
        return pageMetadata({
          t,
          locale,
          paths: Object.fromEntries(Object.entries(article.slugs).map(([code, own]) => [code, website.paths.article(own)])),
          title: article.seoTitle ?? article.title,
          description: article.seoDescription ?? article.excerpt,
          article: { publishedTime: article.publishedAt },
          image: articlePreview(t, locale, article),
        });
      },
      async Page({ params }: SlugParams) {
        const [{ slug }, { t, locale }] = await Promise.all([params, context()]);
        if (slug === NONE) notFound();
        const article = await articles.getArticle(locale, slug);
        if (!article) {
          const own = await articles.slugInLocale(locale, slug);
          if (own) permanentRedirect(href(locale, website.paths.article(own)));
          notFound();
        }
        if (article.slug !== slug) permanentRedirect(href(locale, website.paths.article(article.slug)));

        const others = (await articles.listArticles(locale)).filter((item) => item.id !== article.id);
        const related = [
          ...others.filter((item) => item.topic.key === article.topic.key),
          ...others.filter((item) => item.topic.key !== article.topic.key),
        ].slice(0, 3);
        const crumb = 'hover:text-brand-strong hover:underline';
        const share = config.article?.share;

        return (
          <>
            <article className="overflow-x-clip">
              <JsonLd data={structuredData(t, locale, [articleNode(t, locale, article)])} />
              <header className="article-masthead bg-surface-2">
                <Container className="max-w-4xl pt-10 pb-12 sm:pt-14">
                  <nav aria-label={t.articles.breadcrumb}>
                    <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <li>
                        <Link href={href(locale, '/')} className={crumb}>
                          {t.articles.home}
                        </Link>
                      </li>
                      <li aria-hidden>/</li>
                      <li>
                        <Link href={href(locale, website.paths.articles)} className={crumb}>
                          {t.articles.eyebrow}
                        </Link>
                      </li>
                      <li aria-hidden>/</li>
                      <li>
                        <Link href={href(locale, website.paths.topic(article.topic.slug))} className={crumb}>
                          {article.topic.name}
                        </Link>
                      </li>
                    </ol>
                  </nav>
                  <TopicChip name={article.topic.name} className="mt-8" />
                  <h1 className="display mt-4 text-4xl leading-[1.1] text-balance text-brand-strong sm:text-5xl lg:text-6xl">{article.title}</h1>
                  <p className="mt-5 text-xl leading-relaxed text-muted">{article.excerpt}</p>
                  <ArticleMeta article={article} website={website} locale={locale} t={t} className="mt-6" />
                </Container>
              </header>
              <Container className="mt-10 max-w-5xl">
                {/* `.article-cover`: a site may frame it (globals.css). */}
                <div className="article-cover relative aspect-[16/9] overflow-hidden rounded-card bg-surface-2">
                  <CoverImage cover={article.cover} priority sizes="(min-width: 1024px) 1000px, 100vw" className="size-full object-cover" />
                </div>
              </Container>
              <Container className="max-w-3xl py-14 sm:py-20">
                <ArticleBody html={article.body} playLabel={t.articles.playVideo} />
                <div className="mt-14 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
                  {share && (
                    <ShareBar
                      url={absoluteUrl(localizedPath(locale, website.paths.article(article.slug)))}
                      labels={{ share: t.articles.share, facebook: t.articles.shareFacebook, copy: t.articles.copyLink, copied: t.articles.copied }}
                    />
                  )}
                  <Link href={href(locale, website.paths.articles)} className="inline-flex items-center gap-2 text-sm font-bold text-brand-strong hover:underline">
                    <ArrowLeft aria-hidden className="size-4" />
                    {t.articles.back}
                  </Link>
                </div>
                {config.article?.cta ? config.article.cta(t, locale) : <ArticleCta t={t} />}
              </Container>
            </article>
            {related.length > 0 && (
              <section aria-labelledby="related" className="border-t border-border bg-surface-2 py-16 sm:py-20">
                <Container>
                  <h2 id="related" className="display text-3xl text-brand-strong">
                    {t.articles.related}
                  </h2>
                  <div className="mt-10">
                    <ArticleGrid articles={related} website={website} locale={locale} t={t} />
                  </div>
                </Container>
              </section>
            )}
          </>
        );
      },
    },

    /** A legal page: static, one per language. */
    legal(page: LegalPage) {
      const path = website.legalPath(page); // throws now for a page the site doesn't have
      return {
        async metadata(): Promise<Metadata> {
          const { t, locale } = await context();
          const doc = t.legal[page];
          if (!doc) return {};
          return pageMetadata({ t, locale, paths: website.samePath(path), title: doc.title, description: format(doc.description, { name: business.fullName }) });
        },
        async Page() {
          const { t, locale } = await context();
          return (
            <LegalDocument page={page} website={website} t={t} locale={locale} facts={config.legal?.facts}>
              {config.legal?.after?.(t, locale)}
            </LegalDocument>
          );
        },
      };
    },

    /** [lang]/not-found.tsx */
    async NotFound() {
      const { t, locale } = await context();
      return (
        <Container className="py-28 text-center">
          <p className="display text-8xl text-brand-strong">404</p>
          <h1 className="display mt-4 text-3xl text-balance">{t.notFound.title}</h1>
          <p className="mt-3 text-muted">{t.notFound.text}</p>
          <Link href={href(locale, '/')} className={`${buttonClass.primary} mt-8 rounded-button`}>
            {t.notFound.back}
          </Link>
        </Container>
      );
    },

    /**
     * /sitemap.xml: the fixed pages in every language with their hreflang alternates, then every
     * published article with its own slug. API down: the fixed pages are still served.
     */
    async sitemap(): Promise<MetadataRoute.Sitemap> {
      const pages = localizedSitemap(siteUrl, [...website.locales], website.publicPages, BUILT_AT);
      const lists = await Promise.all(
        website.locales.map(async (locale) => {
          try {
            return (await articles.listArticles(locale)).map((article) => ({
              url: absoluteUrl(localizedPath(locale, website.paths.article(article.slug))),
              lastModified: new Date(article.publishedAt),
              changeFrequency: 'monthly' as const,
              priority: 0.6,
            }));
          } catch {
            return [];
          }
        }),
      );
      return [...pages, ...lists.flat()];
    },

    /** /robots.txt: the whole site is public (no sign-in, no forms). */
    robots(): MetadataRoute.Robots {
      return { rules: [{ userAgent: '*', allow: '/' }], sitemap: absoluteUrl('/sitemap.xml'), host: new URL(siteUrl).host };
    },

    /** app/og/[image]/route.ts: the site's preview card per language, /og/<lang>.png (outside [lang]). */
    ogImage: {
      staticParams() {
        return website.locales.map((locale) => ({ image: `${locale}.png` }));
      },
      async GET(_request: Request, { params }: ImageParams) {
        return ogImageHandler((await params).image);
      },
    },

    /** app/og/<articles>/[lang]/[image]/route.ts: an article's card when it has no cover. */
    articleOgImage: {
      async staticParams() {
        const lists = await Promise.all(
          website.locales.map(async (code) => (await articles.listArticles(code).catch(() => [])).map((article) => ({ lang: code, image: `${article.slug}.png` }))),
        );
        const params = lists.flat();
        return params.length ? params : [{ lang: website.defaultLocale, image: `${NONE}.png` }];
      },
      async GET(_request: Request, { params }: ArticleImageParams) {
        return articleImageHandler(await params);
      },
    },
  };

  return {
    business,
    website,
    siteUrl,
    articles,
    getLocale,
    getMessages,
    absoluteUrl,
    pageMetadata,
    layoutMetadata,
    structuredData,
    latestArticles,
    routes,
  };
}

/** Prerendered once per build: the sitemap's lastModified for the fixed pages. */
const BUILT_AT = new Date();

export type { StaticImageData };
