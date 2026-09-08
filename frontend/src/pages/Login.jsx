import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/helpers';

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.currency);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold mb-2 text-primary-600 dark:text-primary-100">
          💸 Expense Tracker
        </h1>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 space-y-4"
        >
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="name">
                Name
              </label>
              <input id="name" value={form.name} onChange={set('name')} className={inputCls} required minLength={2} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" value={form.email} onChange={set('email')} className={inputCls} required />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={set('password')}
              className={inputCls}
              required
              minLength={mode === 'register' ? 8 : 1}
            />
            {mode === 'register' && (
              <p className="mt-1 text-[11px] text-slate-400">Minimum 8 characters</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300" htmlFor="currency">
                Currency
              </label>
              <select id="currency" value={form.currency} onChange={set('currency')} className={inputCls}>
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.symbol} {code} — {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium text-sm disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login' ? (
              <>No account?{' '}
                <button type="button" className="text-primary-600 dark:text-primary-100 underline" onClick={() => setMode('register')}>
                  Sign up
                </button>
              </>
            ) : (
              <>Already registered?{' '}
                <button type="button" className="text-primary-600 dark:text-primary-100 underline" onClick={() => setMode('login')}>
                  Log in
                </button>
              </>
            )}
          </p>

          {mode === 'login' && (
            <p className="text-center text-[11px] text-slate-400">
              Demo account: demo@example.com / demo1234
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
