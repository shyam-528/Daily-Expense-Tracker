// Seed script: creates a demo user with realistic sample expenses.
// Run: npm run seed
const bcrypt = require('bcryptjs');
const { db, seedDefaultCategoriesForUser } = require('./db');

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

function seed() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
  if (existing) {
    console.log('Demo user already exists. Delete data/expenses.db to reseed.');
    return;
  }

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)')
    .run('Demo User', DEMO_EMAIL, hash, 'USD');
  const userId = result.lastInsertRowid;
  seedDefaultCategoriesForUser(userId);

  const cat = (name) =>
    db.prepare('SELECT id FROM categories WHERE name = ? AND user_id = ?').get(name, userId).id;

  const insert = db.prepare(
    'INSERT INTO expenses (user_id, category_id, amount, date, notes) VALUES (?, ?, ?, ?, ?)'
  );

  // ~90 days of realistic sample data.
  const samples = [
    ['Rent', 1200, 0, 'Monthly rent', 0],
    ['Utilities', 85.5, 0, 'Electricity bill', 3],
    ['Utilities', 45, 0, 'Internet', 10],
    ['Food', 12.99, 1, 'Lunch - pizza', 1],
    ['Food', 6.5, 1, 'Coffee & croissant', 2],
    ['Food', 52.3, 1, 'Weekly groceries', 4],
    ['Food', 8.75, 1, 'Coffee & croissant', 9],
    ['Food', 48.2, 1, 'Weekly groceries', 11],
    ['Food', 15.4, 1, 'Dinner with friends', 6],
    ['Food', 13.25, 1, 'Lunch - sushi', 8],
    ['Travel', 35, 2, 'Train tickets', 5],
    ['Travel', 22.5, 2, 'Fuel', 7],
    ['Travel', 18, 2, 'Taxi to airport', 12],
    ['Shopping', 89.99, 3, 'New shoes', 6],
    ['Shopping', 24.99, 3, 'Phone case', 13],
    ['Entertainment', 15, 4, 'Cinema tickets', 2],
    ['Entertainment', 9.99, 4, 'Streaming subscription', 5],
    ['Health', 30, 5, 'Pharmacy - vitamins', 9],
    ['Health', 75, 5, 'Dentist visit', 14],
    ['Other', 20, 6, 'Gift for friend', 7],
  ];

  const today = new Date();
  const dateStr = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Repeat the pattern over the last 3 months for weekly/monthly trend charts.
  const stmts = [];
  for (let month = 0; month < 3; month++) {
    for (const [catName, amount, , notes, dayOffset] of samples) {
      // skip rent/utilities beyond current month
      if (month > 0 && (catName === 'Rent' || catName === 'Utilities')) continue;
      if (month > 0 && dayOffset > 28) continue;
      stmts.push([userId, cat(catName), amount, dateStr(dayOffset + month * 30), notes]);
    }
  }
  for (const args of stmts) insert.run(...args);

  console.log(`Seeded ${stmts.length} expenses for ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Sample login: email=${DEMO_EMAIL} password=${DEMO_PASSWORD}`);
}

seed();
