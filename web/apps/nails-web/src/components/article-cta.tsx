import { ArrowUpRight, Phone } from 'lucide-react';
import { business } from '@/content/business';
import { BookButton } from '@/features/booking/booking-provider';
import type { Messages } from '@/i18n/dictionaries';
import { pill } from './pill';

/** Under an article: a call to book (the salon's booking dialog), in the site's rose bento. */
export function ArticleCta({ t }: { t: Messages }) {
  return (
    <aside className="mt-10 rounded-3xl bg-rose p-8 text-[#263238] sm:p-10">
      <p className="text-2xl font-extrabold tracking-[-0.02em]">{t.blog.ctaTitle}</p>
      <p className="mt-2 text-[#263238]/75">{t.blog.ctaText}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <BookButton className={pill('ink', 'lg')}>
          {t.booking.open}
          <ArrowUpRight aria-hidden />
        </BookButton>
        <a href={business.phone.href} className={pill('glass', 'lg')}>
          <Phone aria-hidden />
          {business.phone.display}
        </a>
      </div>
    </aside>
  );
}
