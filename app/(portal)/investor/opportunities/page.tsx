import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/guards';
import { listOfferings } from '@/lib/offerings';
import { prisma } from '@/lib/db';
import { OpportunitiesBrowser } from './OpportunitiesBrowser';
import type { OfferingCardData } from '@/components/OfferingCard';

export const metadata: Metadata = { title: 'Opportunities | Cardone Capital | Investor Portal' };

export default async function OpportunitiesPage() {
  const user = await requirePageUser();
  const [offerings, myCommitments] = await Promise.all([
    listOfferings(),
    prisma.commitment.findMany({
      where: { userId: user.id, status: { not: 'WITHDRAWN' } },
      select: { offeringId: true },
    }),
  ]);
  const committedSet = new Set(myCommitments.map((c) => c.offeringId));

  const data: OfferingCardData[] = offerings.map((o) => ({
    slug: o.slug,
    name: o.name,
    status: o.status,
    strategy: o.strategy,
    assetType: o.assetType,
    location: o.location,
    heroImage: o.heroImage,
    summary: o.summary,
    minInvestment: o.minInvestment,
    targetReturn: o.targetReturn,
    targetHold: o.targetHold,
    totalRaise: o.totalRaise,
    amountRaised: o.amountRaised,
    committed: committedSet.has(o.id),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-navy">Investment Opportunities</h1>
        <p className="mt-1 text-sm text-muted">
          Review current and upcoming real-estate offerings. Select an offering to see details,
          documents, and to express interest.
        </p>
      </div>

      <OpportunitiesBrowser offerings={data} />
    </div>
  );
}
