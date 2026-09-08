export default function StatCard({ title, value, subtitle, icon, tone = 'default' }) {
  const tones = {
    default: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    accent: 'bg-primary-600 text-white border-primary-700',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]} ${tone === 'accent' ? '' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs uppercase tracking-wide ${tone === 'accent' ? 'text-primary-50' : 'text-slate-500 dark:text-slate-400'}`}>
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {subtitle && (
            <p className={`mt-1 text-xs ${tone === 'accent' ? 'text-primary-50' : 'text-slate-500 dark:text-slate-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-2xl" aria-hidden>{icon}</span>
      </div>
    </div>
  );
}
