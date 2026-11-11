'use client';

import { Input } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { LoaderCircleIcon, SearchIcon } from 'lucide-react';
import { debounce, useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { ARTICLE_STATUSES, articlesParams } from './search-params';

export interface ArticlesToolbarLabels {
  search: string;
  placeholder: string;
  status: string;
  allStatuses: string;
  category: string;
  allCategories: string;
  statuses: Record<(typeof ARTICLE_STATUSES)[number], string>;
}

/** Radix Select has no empty value: "all" stands for no filter. */
const ALL = 'all';

/** Search + status + topic, bound to the URL (nuqs, shallow: false: the server page re-renders). */
export function ArticlesToolbar({ labels, categories }: { labels: ArticlesToolbarLabels; categories: { id: string; name: string }[] }) {
  const [isLoading, startTransition] = useTransition();
  const [{ search, status, category }, setParams] = useQueryStates(articlesParams, { shallow: false, startTransition });

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <div role="search" className="relative w-full sm:w-64">
        <label htmlFor="articles-search" className="sr-only">
          {labels.search}
        </label>
        <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          id="articles-search"
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
      <Select
        value={status ?? ALL}
        onValueChange={(value) =>
          setParams({ status: ARTICLE_STATUSES.find((s) => s === value) ?? null, page: null })
        }
      >
        <SelectTrigger aria-label={labels.status} className="sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allStatuses}</SelectItem>
          {ARTICLE_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {labels.statuses[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categories.length > 0 && (
        <Select value={category || ALL} onValueChange={(value) => setParams({ category: value === ALL ? null : value, page: null })}>
          <SelectTrigger aria-label={labels.category} className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{labels.allCategories}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
