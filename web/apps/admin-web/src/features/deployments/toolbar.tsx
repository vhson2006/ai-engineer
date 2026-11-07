'use client';

import { Input } from '@web/ui/input';
import { LoaderCircleIcon, SearchIcon } from 'lucide-react';
import { debounce, useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { deploymentsParams } from './search-params';

/**
 * Search box bound to ?search= (nuqs). Typing updates the URL after a pause and re-renders the
 * server page (shallow: false); a new search goes back to page 1.
 */
export function DeploymentsToolbar({ labels }: { labels: { search: string; placeholder: string } }) {
  const [isLoading, startTransition] = useTransition();
  const [{ search }, setParams] = useQueryStates(deploymentsParams, { shallow: false, startTransition });

  return (
    <div role="search" className="relative w-full sm:w-72">
      <label htmlFor="deployments-search" className="sr-only">
        {labels.search}
      </label>
      <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <Input
        id="deployments-search"
        type="search"
        value={search}
        maxLength={100}
        placeholder={labels.placeholder}
        className="pl-9 pr-9"
        onChange={(event) =>
          setParams(
            { search: event.target.value || null, page: null },
            { limitUrlUpdates: event.target.value === '' ? undefined : debounce(350) },
          )
        }
      />
      {isLoading && <LoaderCircleIcon aria-hidden className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" />}
    </div>
  );
}
