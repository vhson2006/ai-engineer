import { MessageCircle, Phone } from 'lucide-react';
import { buttonVariants, cn } from '@web/ui';
import { shop } from '@/content/shop';
import { getMessages } from '@/i18n/messages';

/** Phones: Zalo / call always one tap away. */
export async function MobileActionBar() {
  const t = await getMessages();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:hidden">
      <div className="grid grid-cols-2 gap-2">
        <a href={shop.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-full')}>
          <MessageCircle aria-hidden />
          {t.common.zalo}
        </a>
        <a href={shop.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          <Phone aria-hidden />
          {t.common.callNow}
        </a>
      </div>
    </div>
  );
}
