import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import { formatAmount, formatDate, expensesToCsv, downloadBlob } from '../utils/helpers';

const inputCls =
  'rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', category_id: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState(null); // expense object or null for new
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  const currency = user?.currency || 'USD';
  const limit = 20;

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.search) params.set('search', filters.search);
    params.set('page', page);
    params.set('limit', limit);
    try {
      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(total / limit));

  const handleSaved = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.del(`/expenses/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExport = async () => {
    try {
      await api.download('/expenses/export', 'expenses.csv');
    } catch {
      // Offline fallback: export current page client-side.
      downloadBlob(expensesToCsv(expenses, currency), 'expenses.csv', 'text/csv');
    }
  };

  const set = (k) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  };

  const filterSummary = useMemo(() => {
    const sum = expenses.reduce((s, e) => s + e.amount, 0);
    return `${expenses.length} of ${total} · ${formatAmount(sum, currency)} on this page`;
  }, [expenses, total, currency]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
          >
            ⬇ Export CSV
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
          >
            + Add expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input type="date" value={filters.from} onChange={set('from')} className={inputCls} aria-label="From date" />
        <input type="date" value={filters.to} onChange={set('to')} className={inputCls} aria-label="To date" />
        <select value={filters.category_id} onChange={set('category_id')} className={inputCls} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <input
          value={filters.search}
          onChange={set('search')}
          placeholder="Search notes…"
          className={inputCls}
          aria-label="Search notes"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Notes</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{e.category_icon}</span> {e.category_name}
                  </span>
                </td>
                <td className="px-4 py-2.5 max-w-xs truncate text-slate-500 dark:text-slate-400">{e.notes}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                  {formatAmount(e.amount, currency)}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(e); setShowForm(true); }} className="text-primary-600 dark:text-primary-100 text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(e.id)} className="text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!expenses.length && (
              <tr>
                <td colSpan="5" className="px-4 py-10 text-center text-slate-400">
                  No expenses match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <ul className="md:hidden space-y-2">
        {expenses.map((e) => (
          <li key={e.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex items-center gap-3">
            <span className="text-xl" aria-hidden>{e.category_icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{e.notes || e.category_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(e.date)} · {e.category_name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">{formatAmount(e.amount, currency)}</p>
              <div className="flex gap-2 justify-end mt-1">
                <button onClick={() => { setEditing(e); setShowForm(true); }} className="text-xs text-primary-600 dark:text-primary-100">Edit</button>
                <button onClick={() => handleDelete(e.id)} className="text-xs text-red-600 dark:text-red-400">Delete</button>
              </div>
            </div>
          </li>
        ))}
        {!expenses.length && (
          <li className="py-10 text-center text-slate-400 text-sm">No expenses match your filters</li>
        )}
      </ul>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">{filterSummary}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="px-2 py-1.5">{page} / {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      {showForm && (
        <ExpenseForm
          expense={editing}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
