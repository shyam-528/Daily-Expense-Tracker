# API Reference

Base URL: `http://localhost:5000/api` (dev) — all responses are JSON.
Authenticated routes require `Authorization: Bearer <token>`.

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness check |

## Auth

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{name, email, password, currency?}` | Create account, returns `{user, token}` |
| POST | `/auth/login` | `{email, password}` | Returns `{user, token}` |
| GET | `/auth/me` | — | Current profile |
| PUT | `/auth/me` | `{name?, currency?}` | Update profile |

Validation: name 2–80 chars, password 8–128 chars, currency ISO-4217.

## Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | ✅ | List defaults + custom |
| POST | `/categories` | ✅ | `{name, icon?, color?}` (hex color) |
| PUT | `/categories/:id` | ✅ | Update custom category |
| DELETE | `/categories/:id` | ✅ | Delete (fails if in use) |

## Expenses

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/expenses` | ✅ | List (see filters below), paginated |
| POST | `/expenses` | ✅ | `{amount, category_id? \| category?, date, notes?}` |
| PUT | `/expenses/:id` | ✅ | Partial update |
| DELETE | `/expenses/:id` | ✅ | Delete |
| GET | `/expenses/summary` | ✅ | `?period=day\|week\|month&date=YYYY-MM-DD` |
| GET | `/expenses/export` | ✅ | CSV download (accepts filters) |
| GET | `/expenses/backup` | ✅ | Full JSON backup |
| POST | `/expenses/restore` | ✅ | Restore from backup JSON |

### Query filters (GET /expenses, /export)

| Param | Type | Example |
|---|---|---|
| `from`, `to` | date | `?from=2026-09-01&to=2026-09-30` |
| `category_id` | int | `?category_id=3` |
| `search` | text | `?search=groceries` (matches notes) |
| `min_amount`, `max_amount` | float | `?max_amount=100` |
| `page`, `limit` | int | `?page=2&limit=50` (limit ≤ 200) |
| `sort` | enum | `date_desc` (default) or `date_asc` |

### Expense fields

```json
{
  "id": 1,
  "amount": 42.5,
  "date": "2026-09-08",
  "notes": "Lunch",
  "category_id": 9,
  "category_name": "Food",
  "category_icon": "🍔",
  "category_color": "#f97316",
  "created_at": "2026-09-08 18:01:53",
  "updated_at": "2026-09-08 18:01:53"
}
```

### Summary response

```json
{
  "period": "month",
  "from": "2026-09-01",
  "to": "2026-09-30",
  "count": 12,
  "total": 1565.17,
  "byCategory": { "Rent": 1200, "Food": 365.17 },
  "byDate": { "2026-09-01": 12.99 },
  "expenses": [ ... ]
}
```

## Error format

```json
{ "error": { "message": "Validation failed", "details": [{ "field": "amount", "message": "Amount must be a positive number" }] } }
```

HTTP codes: `400` bad request · `401` unauthenticated · `404` not found · `409` conflict · `422` validation · `429` rate-limited · `500` server error.
