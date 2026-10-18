/**
 * Decimal-safe money helpers. All monetary values are stored and passed around
 * as integer cents (USD). We never do arithmetic on floating-point dollars.
 */

export function dollarsToCents(input: string | number): number {
  const str = typeof input === 'number' ? input.toString() : input.trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error('Invalid currency amount');
  }
  const [whole, frac = ''] = str.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return cents;
}

export function formatUsd(cents: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? false;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

export function formatPct(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}
