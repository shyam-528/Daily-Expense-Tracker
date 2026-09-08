// Expenses CRUD controller with filtering, pagination, CSV export, backup/restore.
const { db } = require('../db');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { buildExpenseFilters, summarize, toLocalDateString } = require('../utils/queryHelpers');

const SELECT_EXPENSE = `
  SELECT e.id, e.amount, e.date, e.notes, e.category_id, c.name AS category_name,
         c.icon AS category_icon, c.color AS category_color, e.created_at, e.updated_at
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
`;

function assertOwnership(expenseId, userId) {
  const row = db
    .prepare('SELECT id FROM expenses WHERE id = ? AND user_id = ?')
    .get(expenseId, userId);
  if (!row) throw new HttpError(404, 'Expense not found');
  return row;
}

function resolveCategoryId({ category_id, category, userId }) {
  if (category_id) {
    const cat = db
      .prepare('SELECT id FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)')
      .get(category_id, userId);
    if (!cat) throw new HttpError(422, 'category_id does not match an existing category');
    return category_id;
  }
  if (category) {
    const existing = db
      .prepare('SELECT id FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)')
      .get(category, userId);
    if (existing) return existing.id;
    const created = db
      .prepare('INSERT INTO categories (name, user_id) VALUES (?, ?)')
      .run(category, userId);
    return created.lastInsertRowid;
  }
  const fallback = db
    .prepare("SELECT id FROM categories WHERE name = 'Other' AND (user_id = ? OR user_id IS NULL)")
    .get(userId);
  return fallback ? fallback.id : null;
}

// GET /api/expenses?from&to&category_id&search&min_amount&max_amount&page&limit&sort
const listExpenses = asyncHandler(async (req, res) => {
  const { clause, params } = buildExpenseFilters({ ...req.query, userId: req.user.id });
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const sort = req.query.sort === 'date_asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM expenses e WHERE ${clause}`).get(params);
  const rows = db
    .prepare(`${SELECT_EXPENSE} WHERE ${clause} ORDER BY e.date ${sort}, e.id ${sort} LIMIT $limit OFFSET $offset`)
    .all({ ...params, limit, offset });

  res.json({ data: rows, page, limit, total: totalRow.c });
});

// POST /api/expenses
const createExpense = asyncHandler(async (req, res) => {
  const { amount, date, notes = null, category_id, category } = req.body;
  const categoryId = resolveCategoryId({ category_id, category, userId: req.user.id });
  if (!categoryId) throw new HttpError(422, 'No category available');

  const result = db
    .prepare(
      'INSERT INTO expenses (user_id, category_id, amount, date, notes) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.user.id, categoryId, amount, date, notes);
  const created = db.prepare(`${SELECT_EXPENSE} WHERE e.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ data: created });
});

// PUT /api/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertOwnership(id, req.user.id);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

  const amount = req.body.amount ?? existing.amount;
  const date = req.body.date ?? existing.date;
  const notes = req.body.notes ?? existing.notes;
  const categoryId = resolveCategoryId({
    category_id: req.body.category_id,
    category: req.body.category,
    userId: req.user.id,
  }) || existing.category_id;

  db.prepare(
    "UPDATE expenses SET amount = ?, date = ?, notes = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(amount, date, notes, categoryId, id);

  const updated = db.prepare(`${SELECT_EXPENSE} WHERE e.id = ?`).get(id);
  res.json({ data: updated });
});

// DELETE /api/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertOwnership(id, req.user.id);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ message: 'Expense deleted', id });
});

// GET /api/expenses/export?format=csv
const exportCsv = asyncHandler(async (req, res) => {
  const { clause, params } = buildExpenseFilters({ ...req.query, userId: req.user.id });
  const rows = db
    .prepare(`${SELECT_EXPENSE} WHERE ${clause} ORDER BY e.date DESC`)
    .all(params);

  const header = 'id,date,category,amount,notes';
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [
    header,
    ...rows.map((r) =>
      [r.id, r.date, r.category_name, r.amount.toFixed(2), r.notes || '']
        .map(esc)
        .join(',')
    ),
  ].join('\r\n');

  const stamp = toLocalDateString();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="expenses-${stamp}.csv"`);
  res.send(csv);
});

// GET /api/expenses/backup -> full JSON backup for restore
const backup = asyncHandler(async (req, res) => {
  const expenses = db
    .prepare(`${SELECT_EXPENSE} WHERE e.user_id = $userId ORDER BY e.date`)
    .all({ userId: req.user.id });
  const categories = db
    .prepare('SELECT id, name, icon, color FROM categories WHERE user_id = ?')
    .all(req.user.id);
  res.json({ exported_at: new Date().toISOString(), categories, expenses });
});

// POST /api/expenses/restore (JSON body from backup)
const restore = asyncHandler(async (req, res) => {
  const { expenses = [], categories = [] } = req.body || {};
  const insertMany = db.transaction((payload) => {
    const catMap = new Map();
    for (const c of payload.categories) {
      const r = db
        .prepare('INSERT INTO categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)')
        .run(c.name, c.icon || '📦', c.color || '#64748b', req.user.id);
      catMap.set(c.name, r.lastInsertRowid);
    }
    let inserted = 0;
    for (const e of payload.expenses) {
      const categoryId =
        catMap.get(e.category_name || e.category) ||
        resolveCategoryId({ category: e.category_name || e.category || 'Other', userId: req.user.id });
      db.prepare(
        'INSERT INTO expenses (user_id, category_id, amount, date, notes) VALUES (?, ?, ?, ?, ?)'
      ).run(req.user.id, categoryId, e.amount, String(e.date).slice(0, 10), e.notes || null);
      inserted += 1;
    }
    return inserted;
  });

  const inserted = insertMany({ expenses, categories });
  res.status(201).json({ message: 'Restore complete', inserted });
});

// GET /api/expenses/summary?period=day|week|month&date=YYYY-MM-DD
const summary = asyncHandler(async (req, res) => {
  const period = req.query.period || 'day';
  const today = toLocalDateString();
  const reference = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : today;

  const d = new Date(reference + 'T00:00:00');
  let from, to;
  if (period === 'week') {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    from = toLocalDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow));
    to = toLocalDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + 6));
  } else if (period === 'month') {
    from = `${reference.slice(0, 7)}-01`;
    to = toLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  } else {
    from = reference;
    to = reference;
  }

  const rows = db
    .prepare(`${SELECT_EXPENSE} WHERE e.user_id = $userId AND e.date BETWEEN $from AND $to`)
    .all({ userId: req.user.id, from, to });
  const stats = summarize(rows);

  res.json({
    period,
    from,
    to,
    ...stats,
    expenses: rows.sort((a, b) => (a.date < b.date ? 1 : -1)),
  });
});

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  exportCsv,
  backup,
  restore,
  summary,
};
