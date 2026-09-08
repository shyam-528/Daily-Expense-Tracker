import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES, downloadBlob, formatAmount } from '../utils/helpers';

const inputCls =
  'rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCurrency(user.currency);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await updateProfile({ name, currency });
      setMessage('Profile updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackup = async () => {
    try {
      const data = await api.get('/expenses/backup');
      downloadBlob(JSON.stringify(data, null, 2), `expense-backup-${Date.now()}.json`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestore = async () => {
    if (!file) return;
    if (!window.confirm('Restore backup? This will ADD the backed-up expenses to your account.')) return;
    setError(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await api.post('/expenses/restore', payload);
      setMessage(`Restored ${res.inserted} expenses`);
    } catch (err) {
      setError(err.message || 'Invalid backup file');
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.download('/expenses/export', 'expenses.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="s-name">Name</label>
          <input id="s-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="s-email">Email</label>
          <input id="s-email" className={`${inputCls} opacity-60`} value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="s-currency">Currency</label>
          <select id="s-currency" className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>{c.symbol} {code} — {c.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium">
          Save changes
        </button>
      </form>

      <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="font-semibold">Data</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportCsv} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">
            ⬇ Export CSV
          </button>
          <button onClick={handleBackup} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">
            💾 Backup (JSON)
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="application/json"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm"
            aria-label="Backup file"
          />
          <button onClick={handleRestore} disabled={!file} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-40">
            ↩ Restore backup
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Backups contain all your categories and expenses as JSON. Restoring adds them back — duplicates possible.
        </p>
      </section>

      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

      <p className="text-xs text-slate-400">
        Logged in as {user?.email} · amounts shown in {formatAmount(0, currency).slice(0, -3)}
      </p>
    </div>
  );
}
