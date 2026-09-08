import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Category breakdown donut chart.
export default function CategoryPie({ byCategory, currency, formatAmount }) {
  const data = Object.entries(byCategory || {})
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
        No expenses in this period
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatAmount(v, currency)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ['#6366f1', '#f97316', '#0ea5e9', '#eab308', '#ec4899', '#22c55e', '#ef4444', '#64748b'];
