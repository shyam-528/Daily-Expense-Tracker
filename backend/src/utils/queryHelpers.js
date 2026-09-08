// Reusable query helpers for date-range filtering and summary aggregation.

// Build WHERE fragments for expense filters (from, to, category_id, search, min/max amount).
function buildExpenseFilters(query) {
  const where = ['e.user_id = $userId'];
  const params = { userId: query.userId };

  if (query.from) {
    where.push('e.date >= $from');
    params.from = query.from.slice(0, 10);
  }
  if (query.to) {
    where.push('e.date <= $to');
    params.to = query.to.slice(0, 10);
  }
  if (query.category_id) {
    where.push('e.category_id = $categoryId');
    params.categoryId = query.category_id;
  }
  if (query.search) {
    where.push('e.notes LIKE $search');
    params.search = `%${query.search}%`;
  }
  if (query.min_amount != null) {
    where.push('e.amount >= $minAmount');
    params.minAmount = query.min_amount;
  }
  if (query.max_amount != null) {
    where.push('e.amount <= $maxAmount');
    params.maxAmount = query.max_amount;
  }

  return { clause: where.join(' AND '), params };
}

// Pure summary computation (unit-testable without HTTP).
function summarize(expenses) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  const byDate = {};
  for (const e of expenses) {
    const catName = e.category_name || e.category || 'Uncategorized';
    byCategory[catName] = (byCategory[catName] || 0) + e.amount;
    byDate[e.date] = (byDate[e.date] || 0) + e.amount;
  }
  return {
    count: expenses.length,
    total: Math.round(total * 100) / 100,
    byCategory,
    byDate,
  };
}

// Validate a YYYY-MM-DD string strictly.
function isValidDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const d = new Date(dateString + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateString;
}

// Convert a Date to YYYY-MM-DD in local time (for "today" lookups).
function toLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { buildExpenseFilters, summarize, isValidDate, toLocalDateString };
