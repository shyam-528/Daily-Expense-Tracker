// Pure unit tests for query helpers (no HTTP).
const { summarize, isValidDate, toLocalDateString, buildExpenseFilters } = require('../src/utils/queryHelpers');

describe('summarize', () => {
  it('computes totals, byCategory, byDate', () => {
    const rows = [
      { amount: 10, category_name: 'Food', date: '2026-09-01' },
      { amount: 5.5, category_name: 'Food', date: '2026-09-01' },
      { amount: 20, category_name: 'Travel', date: '2026-09-02' },
    ];
    const s = summarize(rows);
    expect(s.count).toBe(3);
    expect(s.total).toBe(35.5);
    expect(s.byCategory).toEqual({ Food: 15.5, Travel: 20 });
    expect(s.byDate).toEqual({ '2026-09-01': 15.5, '2026-09-02': 20 });
  });

  it('handles empty input', () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.byCategory).toEqual({});
  });
});

describe('isValidDate', () => {
  it('accepts valid dates', () => {
    expect(isValidDate('2026-09-08')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
  });
  it('rejects invalid dates', () => {
    expect(isValidDate('2026-9-8')).toBe(false);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('hello')).toBe(false);
  });
});

describe('toLocalDateString', () => {
  it('formats with zero padding', () => {
    expect(toLocalDateString(new Date(2026, 8, 8))).toBe('2026-09-08');
  });
});

describe('buildExpenseFilters', () => {
  it('always scopes to user', () => {
    const { clause, params } = buildExpenseFilters({ userId: 7 });
    expect(clause).toContain('e.user_id = $userId');
    expect(params.userId).toBe(7);
  });
  it('adds range + category filters', () => {
    const { clause, params } = buildExpenseFilters({
      userId: 1, from: '2026-09-01', to: '2026-09-30', category_id: 3,
    });
    expect(clause).toContain('e.date >= $from');
    expect(clause).toContain('e.date <= $to');
    expect(clause).toContain('e.category_id = $categoryId');
    expect(params.from).toBe('2026-09-01');
  });
  it('adds LIKE search', () => {
    const { clause, params } = buildExpenseFilters({ userId: 1, search: 'coffee' });
    expect(clause).toContain('e.notes LIKE $search');
    expect(params.search).toBe('%coffee%');
  });
});
