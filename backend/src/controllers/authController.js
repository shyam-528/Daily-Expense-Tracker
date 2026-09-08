// Auth controller: register, login, profile.
const bcrypt = require('bcryptjs');
const { db, seedDefaultCategoriesForUser } = require('../db');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { signToken } = require('../middleware/auth');

const PUBLIC_USER = 'id, name, email, currency, created_at';

const register = asyncHandler(async (req, res) => {
  const { name, email, password, currency = 'USD' } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new HttpError(409, 'Email already registered');

  const hash = await bcrypt.hash(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)')
    .run(name, email, hash, currency);
  seedDefaultCategoriesForUser(result.lastInsertRowid);

  const user = db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ user, token: signToken(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    created_at: user.created_at,
  };
  res.json({ user: publicUser, token: signToken(publicUser) });
});

const me = asyncHandler(async (req, res) => {
  const user = db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(req.user.id);
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, currency } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) throw new HttpError(404, 'User not found');

  db.prepare('UPDATE users SET name = ?, currency = ? WHERE id = ?').run(
    name || user.name,
    currency || user.currency,
    req.user.id
  );
  const updated = db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(req.user.id);
  res.json({ user: updated });
});

module.exports = { register, login, me, updateProfile };
