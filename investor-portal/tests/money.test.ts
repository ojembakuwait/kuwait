import { describe, it, expect } from 'vitest';
import { dollarsToCents, formatUsd, formatPct } from '../lib/money';

describe('dollarsToCents', () => {
  it('parses whole dollars', () => {
    expect(dollarsToCents('5000')).toBe(500000);
  });
  it('parses cents without float drift', () => {
    expect(dollarsToCents('19.99')).toBe(1999);
    expect(dollarsToCents('0.10')).toBe(10);
    expect(dollarsToCents('0.07')).toBe(7); // 0.07*100 would drift in float
  });
  it('strips $ and commas', () => {
    expect(dollarsToCents('$1,250,000')).toBe(125000000);
  });
  it('rejects invalid input', () => {
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('1.234')).toThrow();
    expect(() => dollarsToCents('-5')).toThrow();
  });
});

describe('formatUsd', () => {
  it('formats cents as USD', () => {
    expect(formatUsd(500000)).toBe('$5,000');
    expect(formatUsd(125000000)).toBe('$1,250,000');
  });
  it('shows cents when requested', () => {
    expect(formatUsd(1999, { cents: true })).toBe('$19.99');
  });
});

describe('formatPct', () => {
  it('computes rounded percentage', () => {
    expect(formatPct(18000000, 45000000)).toBe('40%');
    expect(formatPct(0, 100)).toBe('0%');
    expect(formatPct(5, 0)).toBe('0%');
  });
});
