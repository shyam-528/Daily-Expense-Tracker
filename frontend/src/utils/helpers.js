// Formatting + misc helpers (pure, unit-testable).

export const CURRENCIES = {
  USD: { symbol: '$', label: 'US Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'British Pound' },
  INR: { symbol: '₹', label: 'Indian Rupee' },
  JPY: { symbol: '¥', label: 'Japanese Yen' },
  AUD: { symbol: 'A$', label: 'Australian Dollar' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
};

export function formatAmount(amount, currency = 'USD') {
  const sym = CURRENCIES[currency]?.symbol ?? '$';
  const n = Number(amount) || 0;
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Fill missing days in a date range with zero totals (for charts).
export function fillDailyTotals(byDate, from, to) {
  const out = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: key, total: byDate[key] || 0 });
  }
  return out;
}

// Group daily totals into weekly buckets starting Monday.
export function toWeeklyTotals(daily) {
  const weeks = new Map();
  for (const { date, total } of daily) {
    const d = new Date(date + 'T00:00:00');
    const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    d.setDate(d.getDate() - dow);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = weeks.get(key) || { week: key, total: 0 };
    entry.total += total;
    weeks.set(key, entry);
  }
  return [...weeks.values()].sort((a, b) => (a.week < b.week ? -1 : 1));
}

export function downloadBlob(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Client-side CSV fallback (offline export).
export function expensesToCsv(expenses, currency) {
  const header = 'id,date,category,amount,notes';
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = expenses.map((e) =>
    [e.id, e.date, e.category_name, Number(e.amount).toFixed(2), e.notes || '']
      .map(esc)
      .join(',')
  );
  return [header, ...rows].join('\r\n');
}
