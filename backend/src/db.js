// SQLite connection + schema bootstrap (built-in node:sqlite, zero native deps).
// Tables: users, categories, expenses (with indexes for fast queries).
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#f97316' },
  { name: 'Travel', icon: '✈️', color: '#0ea5e9' },
  { name: 'Rent', icon: '🏠', color: '#8b5cf6' },
  { name: 'Utilities', icon: '💡', color: '#eab308' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Health', icon: '💊', color: '#ef4444' },
  { name: 'Entertainment', icon: '🎬', color: '#6366f1' },
  { name: 'Other', icon: '📦', color: '#64748b' },
];

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#64748b',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  const count = db
    .prepare('SELECT COUNT(*) AS c FROM categories WHERE user_id IS NULL')
    .get();
  if (count.c === 0) {
    const insert = db.prepare(
      'INSERT INTO categories (name, icon, color, is_default, user_id) VALUES (?, ?, ?, 1, NULL)'
    );
    for (const c of DEFAULT_CATEGORIES) {
      insert.run(c.name, c.icon, c.color);
    }
  }
}

function seedDefaultCategoriesForUser(userId) {
  const existing = db
    .prepare('SELECT COUNT(*) AS c FROM categories WHERE user_id = ?')
    .get(userId);
  if (existing.c > 0) return;
  const insert = db.prepare(
    "INSERT INTO categories (name, icon, color, is_default, user_id) VALUES (?, ?, ?, 0, ?)"
  );
  const defaults = db
    .prepare('SELECT name, icon, color FROM categories WHERE user_id IS NULL')
    .all();
  for (const c of defaults) insert.run(c.name, c.icon, c.color, userId);
}

initSchema();

module.exports = { db, initSchema, seedDefaultCategoriesForUser, DEFAULT_CATEGORIES };
