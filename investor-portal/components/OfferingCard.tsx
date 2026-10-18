import { StatusBadge } from './StatusBadge';
import { formatUsd, formatPct } from '@/lib/money';

export type OfferingCardData = {
  slug: string;
  name: string;
  status: string;
  strategy: string;
  assetType: string;
  location: string;
  heroImage: string;
  summary: string;
  minInvestment: number;
  targetReturn: string;
  targetHold: string;
  totalRaise: number;
  amountRaised: number;
  committed?: boolean;
};

export function OfferingCard({ o }: { o: OfferingCardData }) {
  const pct = Math.min(100, Math.round((o.amountRaised / o.totalRaise) * 100));
  return (
    <a
      href={`/investor/opportunities/${o.slug}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <div
        className="relative h-44 w-full bg-brand-navy"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(19,41,75,0.82), rgba(19,41,75,0.35)), url(${o.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={o.status} />
          {o.committed && <StatusBadge status="COMMITTED" />}
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="text-xs uppercase tracking-wide opacity-80">{o.assetType}</div>
          <div className="text-lg font-semibold leading-tight">{o.name}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-muted">{o.summary}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Target return</dt>
            <dd className="font-semibold text-ink">{o.targetReturn}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Target hold</dt>
            <dd className="font-semibold text-ink">{o.targetHold}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Minimum</dt>
            <dd className="font-semibold text-ink">{formatUsd(o.minInvestment)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Location</dt>
            <dd className="font-semibold text-ink">{o.location}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{formatPct(o.amountRaised, o.totalRaise)} committed</span>
            <span>
              {formatUsd(o.amountRaised)} / {formatUsd(o.totalRaise)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <span className="mt-4 text-sm font-semibold text-brand-link group-hover:underline">
          View details →
        </span>
      </div>
    </a>
  );
}
