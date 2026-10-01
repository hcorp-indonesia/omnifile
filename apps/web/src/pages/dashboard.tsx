import { ArrowRightLeft, Zap, Globe, TrendingUp } from 'lucide-react';

const stats = [
  {
    label: 'Total Converters',
    value: '—',
    icon: ArrowRightLeft,
    gradient: 'from-primary-500 to-primary-700',
    shadow: 'shadow-primary-500/20',
  },
  {
    label: 'Active',
    value: '—',
    icon: Zap,
    gradient: 'from-emerald-500 to-emerald-700',
    shadow: 'shadow-emerald-500/20',
  },
  {
    label: 'Categories',
    value: '—',
    icon: Globe,
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
  },
  {
    label: 'Conversions Today',
    value: '—',
    icon: TrendingUp,
    gradient: 'from-accent-500 to-purple-600',
    shadow: 'shadow-accent-500/20',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Dashboard</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Overview of your Magic Converter system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-surface-800 dark:bg-surface-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-surface-900 dark:text-surface-100">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow}`}
              >
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Decorative gradient line */}
            <div
              className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Quick Start
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Get started with Magic Converter by setting up your first conversion rules.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/converters"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Manage Converters
          </a>
        </div>
      </div>
    </div>
  );
}
