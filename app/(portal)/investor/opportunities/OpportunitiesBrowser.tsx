'use client';

import { useMemo, useState } from 'react';
import { OfferingCard, type OfferingCardData } from '@/components/OfferingCard';

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'COMING_SOON', label: 'Coming Soon' },
  { key: 'FULLY_SUBSCRIBED', label: 'Fully Subscribed' },
  { key: 'CLOSED', label: 'Closed' },
];

type SortKey = 'default' | 'min-asc' | 'min-desc' | 'progress-desc';

export function OpportunitiesBrowser({ offerings }: { offerings: OfferingCardData[] }) {
  const [tab, setTab] = useState('ALL');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('default');

  const filtered = useMemo(() => {
    let list = offerings.filter((o) => (tab === 'ALL' ? true : o.status === tab));
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((o) =>
        [o.name, o.location, o.assetType, o.strategy, o.summary]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }
    const by: Record<SortKey, (a: OfferingCardData, b: OfferingCardData) => number> = {
      default: () => 0,
      'min-asc': (a, b) => a.minInvestment - b.minInvestment,
      'min-desc': (a, b) => b.minInvestment - a.minInvestment,
      'progress-desc': (a, b) => b.amountRaised / b.totalRaise - a.amountRaised / a.totalRaise,
    };
    return [...list].sort(by[sort]);
  }, [offerings, tab, q, sort]);

  const countFor = (key: string) =>
    key === 'ALL' ? offerings.length : offerings.filter((o) => o.status === key).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search offerings, locations, asset types…"
            aria-label="Search offerings"
            className="field-input pl-9"
          />
          <span aria-hidden className="pointer-events-none absolute left-3 top-2.5 text-muted">
            ⌕
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field-input w-auto py-1.5"
            aria-label="Sort offerings"
          >
            <option value="default">Featured</option>
            <option value="min-asc">Minimum: low to high</option>
            <option value="min-desc">Minimum: high to low</option>
            <option value="progress-desc">Most funded</option>
          </select>
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Offering status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-brand-primary font-semibold text-brand-navy'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label} <span className="text-xs opacity-70">({countFor(t.key)})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          No offerings match your search. Try clearing filters.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OfferingCard key={o.slug} o={o} />
          ))}
        </div>
      )}
    </div>
  );
}
