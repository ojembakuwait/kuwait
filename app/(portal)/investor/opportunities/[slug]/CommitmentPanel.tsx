'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';

type Entity = { id: string; name: string; type: string };
type Existing = { id: string; amountCents: number; status: string; entityId: string } | null;

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function CommitmentPanel({
  offeringId,
  offeringName,
  minInvestment,
  open,
  entities,
  existing,
  csrf,
}: {
  offeringId: string;
  offeringName: string;
  minInvestment: number;
  open: boolean;
  entities: Entity[];
  existing: Existing;
  csrf: string;
}) {
  const router = useRouter();
  const editing = !!existing;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(editing ? 4 : 1);
  const [amount, setAmount] = useState(existing ? (existing.amountCents / 100).toString() : '');
  const [entityId, setEntityId] = useState(existing?.entityId ?? entities[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'view' | 'form'>(editing ? 'view' : 'form');

  const amountCents = Math.round(Number(amount.replace(/[$,\s]/g, '')) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents >= minInvestment;
  const selectedEntity = entities.find((e) => e.id === entityId);

  async function submit(method: 'POST' | 'PUT') {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/commitments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offeringId, entityId, amount, note, csrf }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Something went wrong.');
        setBusy(false);
        return;
      }
      router.refresh();
      setMode('view');
      setStep(4);
    } catch {
      setError('Network error. Please try again.');
    }
    setBusy(false);
  }

  async function withdraw() {
    if (!existing) return;
    setBusy(true);
    const res = await fetch(
      `/api/commitments?id=${encodeURIComponent(existing.id)}&csrf=${encodeURIComponent(csrf)}`,
      { method: 'DELETE' },
    );
    setBusy(false);
    if (res.ok) router.refresh();
  }

  if (!open && !existing) {
    return (
      <div className="card p-5">
        <h3 className="text-base font-semibold text-brand-navy">Not open for interest</h3>
        <p className="mt-2 text-sm text-muted">
          This offering is not currently accepting new expressions of interest.
        </p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-base font-semibold text-brand-navy">Add an investing entity</h3>
        <p className="mt-2 text-sm text-muted">
          You need at least one investing entity before expressing interest.{' '}
          <a className="link" href="/investor/profile">
            Manage entities
          </a>
          .
        </p>
      </div>
    );
  }

  // View existing commitment
  if (mode === 'view' && existing) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-brand-navy">Your interest</h3>
          <StatusBadge status={existing.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Amount</dt>
            <dd className="font-semibold">{fmt(existing.amountCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Entity</dt>
            <dd className="font-semibold">{selectedEntity?.name}</dd>
          </div>
        </dl>
        {existing.status !== 'WITHDRAWN' && (
          <div className="mt-5 flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setMode('form')} disabled={busy}>
              Edit amount
            </button>
            <button
              className="btn-outline flex-1 text-danger"
              onClick={withdraw}
              disabled={busy}
            >
              Withdraw
            </button>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          An expression of interest is non-binding and does not move funds.
        </p>
      </div>
    );
  }

  // Multi-step form
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand-navy">
          {editing ? 'Edit your interest' : 'Express interest'}
        </h3>
        <span className="text-xs text-muted">Step {Math.min(step, 3)} of 3</span>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <label htmlFor="amount" className="field-label">
            Investment amount (USD)
          </label>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={fmt(minInvestment)}
            className="field-input"
            aria-describedby="min-help"
          />
          <p id="min-help" className="mt-1 text-xs text-muted">
            Minimum {fmt(minInvestment)}.
          </p>
          {!amountValid && amount !== '' && (
            <p className="mt-1 text-xs text-danger">Amount must be at least {fmt(minInvestment)}.</p>
          )}
          <button
            className="btn-primary mt-4 w-full"
            disabled={!amountValid}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label htmlFor="entity" className="field-label">
            Investing entity
          </label>
          <select
            id="entity"
            className="field-input"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          >
            {entities.map((en) => (
              <option key={en.id} value={en.id}>
                {en.name} ({en.type})
              </option>
            ))}
          </select>
          <label htmlFor="note" className="field-label mt-4">
            Note (optional)
          </label>
          <textarea
            id="note"
            className="field-input"
            rows={2}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-4 flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary flex-1" onClick={() => setStep(3)}>
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <dl className="space-y-2 rounded border border-line bg-canvas p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Offering</dt>
              <dd className="font-semibold">{offeringName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Amount</dt>
              <dd className="font-semibold">{fmt(amountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Entity</dt>
              <dd className="font-semibold">{selectedEntity?.name}</dd>
            </div>
          </dl>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm this non-binding expression of interest. No funds are moved and no
              agreement is signed at this step. (Demo — simulated.)
            </span>
          </label>
          <div className="mt-4 flex gap-2">
            <button className="btn-outline flex-1" onClick={() => setStep(2)} disabled={busy}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!confirm || busy}
              onClick={() => submit(editing ? 'PUT' : 'POST')}
            >
              {busy ? 'Submitting…' : editing ? 'Save changes' : 'Submit interest'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
