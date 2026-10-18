const MAP: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'bg-success/10 text-success border-success/30' },
  COMING_SOON: { label: 'Coming Soon', cls: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' },
  FULLY_SUBSCRIBED: { label: 'Fully Subscribed', cls: 'bg-warning/10 text-warning border-warning/30' },
  CLOSED: { label: 'Closed', cls: 'bg-muted/10 text-muted border-muted/30' },
  // commitment states
  INTEREST: { label: 'Interest Submitted', cls: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' },
  COMMITTED: { label: 'Committed', cls: 'bg-success/10 text-success border-success/30' },
  FUNDED: { label: 'Funded', cls: 'bg-success/10 text-success border-success/30' },
  WITHDRAWN: { label: 'Withdrawn', cls: 'bg-muted/10 text-muted border-muted/30' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-muted/10 text-muted border-muted/30' };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
