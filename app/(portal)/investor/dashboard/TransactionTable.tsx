'use client';

import { useMemo, useState } from 'react';
import { formatUsd } from '@/lib/money';

type Row = {
  id: string;
  date: string;
  type: string;
  amountCents: number;
  offering: string;
  entity: string;
  memo: string;
};

const TYPES = ['ALL', 'CONTRIBUTION', 'DISTRIBUTION', 'CAPITAL_CALL'];

export function TransactionTable({ rows }: { rows: Row[] }) {
  const [type, setType] = useState('ALL');

  const filtered = useMemo(
    () => (type === 'ALL' ? rows : rows.filter((r) => r.type === type)),
    [rows, type],
  );

  if (rows.length === 0) {
    return <div className="card mt-3 p-8 text-center text-muted">No transactions recorded yet.</div>;
  }

  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded border px-3 py-1 text-xs ${
              type === t
                ? 'border-brand-primary bg-brand-primary/10 font-semibold text-brand-primary'
                : 'border-line text-muted hover:text-ink'
            }`}
          >
            {t === 'ALL' ? 'All' : t.replace('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Offering</th>
              <th className="py-2 pr-4">Entity</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <td className="py-3 pr-4 text-muted">{r.date}</td>
                <td className="py-3 pr-4 capitalize">{r.type.replace('_', ' ').toLowerCase()}</td>
                <td className="py-3 pr-4">{r.offering}</td>
                <td className="py-3 pr-4 text-muted">{r.entity}</td>
                <td
                  className={`py-3 text-right font-medium ${
                    r.type === 'DISTRIBUTION' ? 'text-success' : 'text-ink'
                  }`}
                >
                  {r.type === 'DISTRIBUTION' ? '+' : ''}
                  {formatUsd(r.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-3 text-center text-sm text-muted">No transactions of this type.</p>
      )}
    </div>
  );
}
