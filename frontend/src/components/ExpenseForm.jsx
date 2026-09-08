import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatAmount, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300';

// Add/Edit expense form used as modal dialog.
export default function ExpenseForm({ expense, categories, onClose, onSaved }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(expense ? expense.category_id : '');
  const [date, setDate] = useState(expense ? expense.date : new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(expense ? expense.notes || '' : '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) return;
    // default to first category
    if (!categoryId && categories.length) setCategoryId(categories[0].id);
  }, [categories, categoryId, expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than 0');
    if (!date) return setError('Date is required');

    setSaving(true);
    try {
      const body = { amount: Number(amount), category_id: Number(categoryId), date, notes: notes || null };
      const res = expense
        ? await api.put(`/expenses/${expense.id}`, body)
        : await api.post('/expenses', body);
      onSaved(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-xl space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {expense ? 'Edit Expense' : 'Add Expense'}
        </h2>

        <div>
          <label className={labelCls} htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="category">Category</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className={inputCls}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
            rows="2"
            placeholder="Optional notes"
            maxLength="500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}
          </button>
        </div>
        {expense && (
          <p className="text-xs text-slate-400 text-center">
            {formatAmount(expense.amount, user?.currency)} on {formatDate(expense.date)}
          </p>
        )}
      </form>
    </div>
  );
}
