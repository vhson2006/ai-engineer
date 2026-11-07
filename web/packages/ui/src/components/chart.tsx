'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../lib/cn';

/**
 * Charts (recharts) in the design tokens. Two ready-made charts cover most dashboards; for anything
 * else, compose recharts directly inside <ChartFrame> with the same tokens (var(--brand) …).
 * Data comes from the server page as props; labels are already translated.
 */

export interface ChartSeries {
  key: string;
  label: string;
  /** Any CSS color; default: the brand color. */
  color?: string;
}

const AXIS = { stroke: 'var(--subtle)', fontSize: 12, tickLine: false, axisLine: false } as const;

/** Fixed-height, full-width frame; the chart scales inside it. */
export function ChartFrame({ height = 260, className, children, label }: { height?: number; className?: string; children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className={cn('w-full text-xs', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

type ChartRow = Record<string, unknown>;

interface TooltipCardProps {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; color?: string; dataKey?: unknown; payload?: { fill?: string } }>;
  label?: unknown;
  format?: (value: number) => string;
}

function TooltipCard({ active, payload, label, format }: TooltipCardProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1.5 font-medium text-fg">{String(label)}</p>}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center justify-between gap-4 text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ background: item.color ?? item.payload?.fill }} />
              {String(item.name ?? '')}
            </span>
            <span className="font-medium tabular-nums text-fg">{format ? format(Number(item.value)) : String(item.value ?? '')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarChartProps {
  data: ChartRow[];
  /** The category key (x axis, or y axis when horizontal). */
  categoryKey: string;
  series: ChartSeries[];
  /** Accessible summary of the chart (it is an image for screen readers). */
  label: string;
  height?: number;
  horizontal?: boolean;
  /** Per-category colors for a single series (e.g. one color per status). */
  colorOf?: (row: ChartRow) => string | undefined;
  valueFormat?: (value: number) => string;
  className?: string;
}

export function BarChart({
  data,
  categoryKey,
  series,
  label,
  height,
  horizontal = false,
  colorOf,
  valueFormat,
  className,
}: BarChartProps) {
  return (
    <ChartFrame height={height} label={label} className={className}>
      <RechartsBarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : -16 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey={categoryKey} width={96} {...AXIS} />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} {...AXIS} />
            <YAxis allowDecimals={false} {...AXIS} />
          </>
        )}
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(props) => <TooltipCard active={props.active} payload={props.payload as TooltipCardProps['payload']} label={props.label} format={valueFormat} />} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? 'var(--brand)'} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={44}>
            {colorOf && series.length === 1 && data.map((row, index) => <Cell key={index} fill={colorOf(row) ?? s.color ?? 'var(--brand)'} />)}
          </Bar>
        ))}
      </RechartsBarChart>
    </ChartFrame>
  );
}

export interface AreaChartProps {
  data: ChartRow[];
  categoryKey: string;
  series: ChartSeries[];
  label: string;
  height?: number;
  stacked?: boolean;
  valueFormat?: (value: number) => string;
  className?: string;
}

export function AreaChart({ data, categoryKey, series, label, height, stacked = false, valueFormat, className }: AreaChartProps) {
  return (
    <ChartFrame height={height} label={label} className={className}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? 'var(--brand)'} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color ?? 'var(--brand)'} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={categoryKey} {...AXIS} minTickGap={16} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip content={(props) => <TooltipCard active={props.active} payload={props.payload as TooltipCardProps['payload']} label={props.label} format={valueFormat} />} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? 'var(--brand)'}
            strokeWidth={2}
            fill={`url(#fill-${s.key})`}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ChartFrame>
  );
}
