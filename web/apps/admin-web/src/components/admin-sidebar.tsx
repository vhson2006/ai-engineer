import { isSuperadmin } from '@web/core/auth/roles';
import { getSessionUser } from '@web/core/auth/session';
import { SidebarDrawer, SidebarNav, type SidebarGroup } from '@web/ui/sidebar-nav';
import { BoxesIcon, LayoutDashboardIcon, PaletteIcon } from 'lucide-react';
import { mySites } from '@/features/sites/data';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';

/**
 * The side menu (ADR 0030): the overview, one item per site the user manages (from the API, which
 * filters them), and the system pages for superadmins only. Display only: every page checks again.
 */
async function sidebarGroups(t: Messages, locale: Locale): Promise<SidebarGroup[] | null> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return null;

  const sites = await mySites();
  const groups: SidebarGroup[] = [
    { items: [{ href: href(locale, '/'), label: t.nav.overview, exact: true, icon: <LayoutDashboardIcon className="size-4" /> }] },
    {
      label: t.nav.sites,
      items: (sites.ok ? sites.data : []).map((site) => {
        const base = href(locale, `/sites/${site.id}`);
        return {
          href: base,
          label: site.name,
          icon: <SiteInitials name={site.name} />,
          children: [
            { href: `${base}/articles`, label: t.nav.articles },
            { href: `${base}/categories`, label: t.nav.categories },
          ],
        };
      }),
    },
  ];
  if (isSuperadmin(user)) {
    groups.push({
      label: t.nav.system,
      items: [
        { href: href(locale, '/deployments'), label: t.nav.deployments, icon: <BoxesIcon className="size-4" /> },
        { href: href(locale, '/design-system'), label: t.nav.designSystem, icon: <PaletteIcon className="size-4" /> },
      ],
    });
  }
  return groups;
}

export async function AdminSidebar({ t, locale }: { t: Messages; locale: Locale }) {
  const groups = await sidebarGroups(t, locale);
  if (!groups) return null;
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border px-3 py-6 lg:block">
      <SidebarNav groups={groups} label={t.nav.label} />
      {groups[1].items.length === 0 && <p className="px-3 pt-2 text-sm text-subtle">{t.nav.noSites}</p>}
    </aside>
  );
}

/** Small screens: the same menu behind a button in the header. */
export async function AdminMobileNav({ t, locale }: { t: Messages; locale: Locale }) {
  const groups = await sidebarGroups(t, locale);
  if (!groups) return null;
  return (
    <SidebarDrawer openLabel={t.nav.openMenu} closeLabel={t.nav.closeMenu}>
      <SidebarNav groups={groups} label={t.nav.label} />
    </SidebarDrawer>
  );
}

function SiteInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span aria-hidden className="inline-flex size-5 items-center justify-center rounded bg-brand-soft text-[0.6rem] font-bold text-brand-soft-fg">
      {initials}
    </span>
  );
}
