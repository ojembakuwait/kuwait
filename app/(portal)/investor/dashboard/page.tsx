import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { formatUsd } from '@/lib/money';
import { TransactionTable } from './TransactionTable';

export const metadata: Metadata = { title: 'Dashboard | Cardone Capital | Investor Portal' };

export default async function DashboardPage() {
  const user = await requirePageUser();

  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    include: { offering: true, entity: true, transactions: { orderBy: { date: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });

  // Totals are derived from stored records — never hardcoded.
  const totals = investments.reduce(
    (acc, inv) => {
      acc.committed += inv.committedCents;
      acc.funded += inv.fundedCents;
      acc.distributed += inv.distributedCents;
      return acc;
    },
    { committed: 0, funded: 0, distributed: 0 },
  );

  const allTx = investments.flatMap((inv) =>
    inv.transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      amountCents: t.amountCents,
      offering: inv.offering.name,
      entity: inv.entity.name,
      memo: t.memo ?? '',
    })),
  );
  allTx.sort((a, b) => (a.date < b.date ? 1 : -1));

  const cards = [
    { label: 'Total committed', value: totals.committed },
    { label: 'Total funded', value: totals.funded },
    { label: 'Total distributed', value: totals.distributed },
    { label: 'Net invested', value: totals.funded - totals.distributed },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        Your positions and activity across all investing entities.
      </p>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-xs text-muted">{c.label}</div>
            <div className="mt-1 text-xl font-semibold text-ink">{formatUsd(c.value)}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-navy">Positions</h2>
        {investments.length === 0 ? (
          <div className="card mt-3 p-8 text-center text-muted">
            You have no funded investments yet. Explore{' '}
            <a className="link" href="/investor/opportunities">
              opportunities
            </a>
            .
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-4">Offering</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4 text-right">Committed</th>
                  <th className="py-2 pr-4 text-right">Funded</th>
                  <th className="py-2 text-right">Distributed</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} className="border-b border-line/60">
                    <td className="py-3 pr-4 font-medium">{inv.offering.name}</td>
                    <td className="py-3 pr-4 text-muted">{inv.entity.name}</td>
                    <td className="py-3 pr-4 text-right">{formatUsd(inv.committedCents)}</td>
                    <td className="py-3 pr-4 text-right">{formatUsd(inv.fundedCents)}</td>
                    <td className="py-3 text-right">{formatUsd(inv.distributedCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-brand-navy">Transactions</h2>
        <TransactionTable rows={allTx} />
      </section>
    </div>
  );
}
