import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import CategoryPie from '../components/CategoryPie';
import TrendChart from '../components/TrendChart';
import { formatAmount, formatDate, fillDailyTotals, toWeeklyTotals } from '../utils/helpers';

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('day');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/expenses/summary?period=${period}`)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) {
    return <p className="text-center text-slate-400 py-20">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link to="/login" className="text-primary-600 underline text-sm">Go to login</Link>
      </div>
    );
  }

  const currency = user?.currency || 'USD';
  const daily = fillDailyTotals(summary.byDate, summary.from, summary.to);
  const weekly = toWeeklyTotals(daily);
  const topCategory = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Greeting + period switcher */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hi {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(summary.from)} – {formatDate(summary.to)}
          </p>
        </div>
        <div className="ml-auto inline-flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 ${period === p.key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          tone="accent"
          title={`${PERIODS.find((p) => p.key === period).label} total`}
          value={formatAmount(summary.total, currency)}
          subtitle={`${summary.count} expense${summary.count === 1 ? '' : 's'}`}
          icon="💰"
        />
        <StatCard
          title="Top category"
          value={topCategory ? topCategory[0] : '—'}
          subtitle={topCategory ? formatAmount(topCategory[1], currency) : 'No data'}
          icon="🏆"
        />
        <StatCard
          title="Avg / day"
          value={formatAmount(
            daily.length ? summary.total / daily.length : 0,
            currency
          )}
          subtitle="Over selected period"
          icon="📊"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="font-semibold mb-2">
            {period === 'week' || period === 'month' ? 'Daily spending' : 'Spending'}
          </h2>
          {daily.length > 1 ? (
            <TrendChart data={daily} label="Spent" />
          ) : daily.length === 1 ? (
            <TrendChart data={daily} label="Spent" />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No data yet — add your first expense!
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="font-semibold mb-2">By category</h2>
          <CategoryPie byCategory={summary.byCategory} currency={currency} formatAmount={formatAmount} />
        </section>
      </div>

      {weekly.length > 1 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="font-semibold mb-2">Weekly trend</h2>
          <TrendChart data={weekly} xKey="week" label="Spent" />
        </section>
      )}

      {/* Recent expenses */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Recent expenses</h2>
          <Link to="/expenses" className="text-sm text-primary-600 dark:text-primary-100 hover:underline">
            View all →
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {summary.expenses.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl" aria-hidden>{e.category_icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.notes || e.category_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(e.date)} · {e.category_name}
                </p>
              </div>
              <span className="ml-auto font-semibold tabular-nums">
                {formatAmount(e.amount, currency)}
              </span>
            </li>
          ))}
          {!summary.expenses.length && (
            <li className="py-6 text-center text-sm text-slate-400">Nothing logged in this period</li>
          )}
        </ul>
      </section>
    </div>
  );
}
