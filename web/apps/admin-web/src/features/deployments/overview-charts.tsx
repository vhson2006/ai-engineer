'use client';

import type { DeploymentStatus } from '@web/core/api';
import { AreaChart, BarChart } from '@web/ui/chart';

const STATUS_COLOR: Record<DeploymentStatus, string> = {
  pending: '#f59e0b',
  running: '#0ea5e9',
  succeeded: '#10b981',
  failed: '#ef4444',
};

export interface OverviewChartsProps {
  byStatus: { status: DeploymentStatus; label: string; count: number }[];
  byDay: { day: string; count: number }[];
  intlLocale: string;
  labels: { status: string; statusLabel: string; activity: string; activityLabel: string; series: string };
}

/** The overview's charts. Data is computed on the server; colors and number format here (client). */
export function OverviewCharts({ byStatus, byDay, intlLocale, labels }: OverviewChartsProps) {
  const number = new Intl.NumberFormat(intlLocale);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">{labels.status}</h2>
        <BarChart
          className="mt-4"
          data={byStatus}
          categoryKey="label"
          series={[{ key: 'count', label: labels.series }]}
          colorOf={(row) => STATUS_COLOR[row.status as DeploymentStatus]}
          valueFormat={(value) => number.format(value)}
          label={labels.statusLabel}
          height={220}
          horizontal
        />
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">{labels.activity}</h2>
        <AreaChart
          className="mt-4"
          data={byDay}
          categoryKey="day"
          series={[{ key: 'count', label: labels.series }]}
          valueFormat={(value) => number.format(value)}
          label={labels.activityLabel}
          height={220}
        />
      </section>
    </div>
  );
}
