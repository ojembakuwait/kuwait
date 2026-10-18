import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { formatUsd } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';

export const metadata: Metadata = { title: 'My Commitments | Cardone Capital' };

export default async function CommitmentsPage() {
  const user = await requirePageUser();
  const commitments = await prisma.commitment.findMany({
    where: { userId: user.id },
    include: { offering: true, entity: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-navy">My Commitments</h1>
      <p className="mt-1 text-sm text-muted">
        Expressions of interest and commitments across your investing entities.
      </p>

      {commitments.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-muted">
          You haven&apos;t expressed interest in any offering yet. Browse{' '}
          <a className="link" href="/investor/opportunities">
            opportunities
          </a>
          .
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="py-2 pr-4">Offering</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {commitments.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-medium">
                    <a className="link" href={`/investor/opportunities/${c.offering.slug}`}>
                      {c.offering.name}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-muted">{c.entity.name}</td>
                  <td className="py-3 pr-4 text-right">{formatUsd(c.amountCents)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 text-muted">{c.updatedAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
