import { describe, it, expect } from 'vitest';
import {
  formatAmount,
  todayStr,
  formatDate,
  fillDailyTotals,
  toWeeklyTotals,
  expensesToCsv,
} from '../utils/helpers';

describe('formatAmount', () => {
  it('formats USD', () => {
    expect(formatAmount(1234.5, 'USD')).toBe('$1,234.50');
  });
  it('formats INR with symbol', () => {
    expect(formatAmount(100, 'INR')).toContain('₹');
  });
  it('handles NaN gracefully', () => {
    expect(formatAmount(undefined, 'USD')).toBe('$0.00');
  });
});

describe('todayStr / formatDate', () => {
  it('returns zero-padded YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('formats dates for display', () => {
    expect(formatDate('2026-09-08')).toBeTruthy();
  });
});

describe('fillDailyTotals', () => {
  it('fills missing days with zero', () => {
    const out = fillDailyTotals({ '2026-09-01': 10 }, '2026-09-01', '2026-09-03');
    expect(out).toEqual([
      { date: '2026-09-01', total: 10 },
      { date: '2026-09-02', total: 0 },
      { date: '2026-09-03', total: 0 },
    ]);
  });
});

describe('toWeeklyTotals', () => {
  it('buckets days into Monday-start weeks', () => {
    // 2026-09-07 is a Monday, 2026-09-13 Sunday -> same week
    const daily = [
      { date: '2026-09-07', total: 5 },
      { date: '2026-09-09', total: 7 },
      { date: '2026-09-13', total: 3 },
    ];
    const weeks = toWeeklyTotals(daily);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].total).toBe(15);
    expect(weeks[0].week).toBe('2026-09-07');
  });
});

describe('expensesToCsv', () => {
  it('renders header + escaped rows', () => {
    const csv = expensesToCsv([
      { id: 1, date: '2026-09-08', category_name: 'Food', amount: 12.5, notes: 'lunch "big"' },
    ]);
    expect(csv.split('\r\n')[0]).toBe('id,date,category,amount,notes');
    expect(csv).toContain('"lunch ""big"""');
  });
});
