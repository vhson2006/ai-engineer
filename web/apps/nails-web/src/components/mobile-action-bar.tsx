import { BookOpen, Phone } from 'lucide-react';
import { buttonVariants, cn } from '@web/ui';
import { salon } from '@/content/salon';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** Phones: call / menu always one tap away. */
export async function MobileActionBar() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:hidden">
      <div className="grid grid-cols-2 gap-2">
        <a href={`${href(locale, '/')}#menu`} className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-full')}>
          <BookOpen aria-hidden />
          {t.nav.menu}
        </a>
        <a href={salon.phones[0].href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          <Phone aria-hidden />
          {t.common.callNow}
        </a>
      </div>
    </div>
  );
}
