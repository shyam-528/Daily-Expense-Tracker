// Unit + integration tests. Uses a throwaway test DB, never real data.
process.env.NODE_ENV = 'test';
process.env.DB_PATH = require('path').join(__dirname, '..', 'data', 'test.db');

const fs = require('fs');
if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);

const request = require('supertest');
const createApp = require('../src/app');
const { db } = require('../src/db');

let app;
let token;
let userId;

const TEST_EMAIL = 'test@example.com';

beforeAll(() => {
  // Fresh schema for the test DB.
  db.exec('DELETE FROM expenses; DELETE FROM categories WHERE user_id IS NOT NULL; DELETE FROM users;');
  app = createApp();
});

afterAll(() => {
  db.close();
});

async function registerAndLogin() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: TEST_EMAIL, password: 'password123' });
  token = res.body.token;
  userId = res.body.user.id;
  return res;
}

describe('Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth', () => {
  it('registers a new user', async () => {
    const res = await registerAndLogin();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: TEST_EMAIL, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@example.com', password: '123' });
    expect(res.status).toBe(422);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('blocks /auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });
});

describe('Categories', () => {
  it('lists default categories for a new user', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
  });

  it('creates a custom category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pets', icon: '🐶', color: '#22c55e' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Pets');
  });

  it('rejects duplicate category name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pets' });
    expect(res.status).toBe(409);
  });

  it('deletes an unused custom category', async () => {
    const create = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TempCat' });
    const del = await request(app)
      .delete(`/api/categories/${create.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});

describe('Expenses CRUD', () => {
  it('creates an expense with category name', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 25.5, category: 'Food', date: '2026-09-01', notes: 'Lunch' });
    expect(res.status).toBe(201);
    expect(res.body.data.category_name).toBe('Food');
    expect(res.body.data.amount).toBe(25.5);
  });

  it('creates an expense with category_id', async () => {
    const cats = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    const food = cats.body.data.find((c) => c.name === 'Food');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10, category_id: food.id, date: '2026-09-02' });
    expect(res.status).toBe(201);
    expect(res.body.data.category_name).toBe('Food');
  });

  it('rejects invalid amount', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -5, category: 'Food', date: '2026-09-01' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid date', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5, category: 'Food', date: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('lists expenses with pagination', async () => {
    const res = await request(app)
      .get('/api/expenses?limit=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/expenses?from=2026-09-01&to=2026-09-01')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((e) => e.date === '2026-09-01')).toBe(true);
  });

  it('filters by search text', async () => {
    const res = await request(app)
      .get('/api/expenses?search=Lunch')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((e) => (e.notes || '').includes('Lunch'))).toBe(true);
  });

  it('updates an expense', async () => {
    const created = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5, category: 'Travel', date: '2026-09-03' });
    const res = await request(app)
      .put(`/api/expenses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 99, notes: 'Updated fare' });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(99);
    expect(res.body.data.notes).toBe('Updated fare');
  });

  it('deletes an expense', async () => {
    const created = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1, category: 'Other', date: '2026-09-03' });
    const res = await request(app)
      .delete(`/api/expenses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.find((e) => e.id === created.body.data.id)).toBeUndefined();
  });

  it('returns 404 for another user\'s expense', async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'other@example.com', password: 'password123' });
    const otherToken = other.body.token;
    const mine = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${token}`);
    const someId = mine.body.data[0].id;
    const res = await request(app)
      .delete(`/api/expenses/${someId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Summary & Export', () => {
  it('returns summary for a period', async () => {
    const res = await request(app)
      .get('/api/expenses/summary?period=month&date=2026-09-01')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('month');
    expect(typeof res.body.total).toBe('number');
    expect(res.body.byCategory).toBeDefined();
  });

  it('exports CSV', async () => {
    const res = await request(app)
      .get('/api/expenses/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.startsWith('id,date,category,amount,notes')).toBe(true);
  });

  it('backup returns expenses + categories', async () => {
    const res = await request(app)
      .get('/api/expenses/backup')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });
});

describe('Static + middleware', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 for malformed token', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', 'Bearer nonsense');
    expect(res.status).toBe(401);
  });
});
