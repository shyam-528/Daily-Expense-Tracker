// Categories CRUD controller.
const { db } = require('../db');
const { asyncHandler, HttpError } = require('../middleware/errors');

const listCategories = asyncHandler(async (req, res) => {
  const rows = db
    .prepare(
      'SELECT id, name, icon, color, is_default, (user_id IS NULL) AS is_global FROM categories WHERE user_id = ? OR user_id IS NULL ORDER BY is_global DESC, name ASC'
    )
    .all(req.user.id);
  res.json({ data: rows });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, icon = '📦', color = '#64748b' } = req.body;
  const dup = db
    .prepare('SELECT id FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)')
    .get(name, req.user.id);
  if (dup) throw new HttpError(409, 'Category name already exists');

  const result = db
    .prepare('INSERT INTO categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)')
    .run(name, icon, color, req.user.id);
  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: created });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(id, req.user.id);
  if (!row) throw new HttpError(404, 'Category not found (or is a global default)');

  const { name = row.name, icon = row.icon, color = row.color } = req.body;
  db.prepare('UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?').run(name, icon, color, id);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ data: updated });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(id, req.user.id);
  if (!row) throw new HttpError(404, 'Category not found (or is a global default)');

  const inUse = db
    .prepare('SELECT COUNT(*) AS c FROM expenses WHERE category_id = ?')
    .get(id);
  if (inUse.c > 0) throw new HttpError(409, 'Category is in use by expenses; reassign them first');

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ message: 'Category deleted', id });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
