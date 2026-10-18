import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/guards';
import { ensureCsrfToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOfferingBySlug, isOpenForInterest } from '@/lib/offerings';
import { formatUsd, formatPct } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { CommitmentPanel } from './CommitmentPanel';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const o = await getOfferingBySlug(params.slug);
  return { title: o ? `${o.name} | Opportunities` : 'Offering not found' };
}

export default async function OfferingDetailPage({ params }: { params: { slug: string } }) {
  const user = await requirePageUser();
  const offering = await getOfferingBySlug(params.slug);
  if (!offering) notFound();

  const csrf = ensureCsrfToken();
  const [entities, commitments] = await Promise.all([
    prisma.investingEntity.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    prisma.commitment.findMany({
      where: { userId: user.id, offeringId: offering.id, status: { not: 'WITHDRAWN' } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const existing = commitments[0]
    ? {
        id: commitments[0].id,
        amountCents: commitments[0].amountCents,
        status: commitments[0].status,
        entityId: commitments[0].entityId,
      }
    : null;

  const pct = Math.min(100, Math.round((offering.amountRaised / offering.totalRaise) * 100));

  return (
    <div>
      <a href="/investor/opportunities" className="link text-sm">
        ← Back to opportunities
      </a>

      <div
        className="mt-3 flex min-h-[220px] flex-col justify-end rounded-lg p-6 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(19,41,75,0.85), rgba(19,41,75,0.45)), url(${offering.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mb-2 flex gap-2">
          <StatusBadge status={offering.status} />
        </div>
        <div className="text-xs uppercase tracking-wide opacity-80">
          {offering.assetType} · {offering.location}
        </div>
        <h1 className="text-3xl font-semibold">{offering.name}</h1>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Target return', offering.targetReturn],
              ['Target hold', offering.targetHold],
              ['Minimum', formatUsd(offering.minInvestment)],
              ['Strategy', offering.strategy],
            ].map(([k, v]) => (
              <div key={k} className="card p-3">
                <div className="text-xs text-muted">{k}</div>
                <div className="mt-1 font-semibold text-ink">{v}</div>
              </div>
            ))}
          </section>

          <section className="mt-6">
            <div className="mb-1 flex justify-between text-sm text-muted">
              <span>{formatPct(offering.amountRaised, offering.totalRaise)} committed</span>
              <span>
                {formatUsd(offering.amountRaised)} of {formatUsd(offering.totalRaise)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
            </div>
          </section>

          <section className="prose-sm mt-8 max-w-none">
            <h2 className="text-lg font-semibold text-brand-navy">Overview</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
              {offering.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-navy">Offering documents</h2>
            {offering.documents.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No documents posted for this offering yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded border border-line">
                {offering.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-ink">{d.title}</div>
                      <div className="text-xs text-muted">
                        {d.category} · {(d.sizeBytes / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <a className="link text-sm" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="mt-8 rounded border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            Provisional reconstruction: the reference offering-detail layout is behind
            authentication and was not visually verified. Figures and copy are synthetic.
          </p>
        </div>

        <aside>
          <CommitmentPanel
            offeringId={offering.id}
            offeringName={offering.name}
            minInvestment={offering.minInvestment}
            open={isOpenForInterest(offering.status)}
            entities={entities.map((e) => ({ id: e.id, name: e.name, type: e.type }))}
            existing={existing}
            csrf={csrf}
          />
        </aside>
      </div>
    </div>
  );
}
