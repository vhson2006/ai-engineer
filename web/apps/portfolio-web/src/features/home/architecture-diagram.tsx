'use client';

import { useId, useState } from 'react';
import { cn } from '@web/ui';

export type NodeId = 'browser' | 'gateway' | 'bff' | 'keycloak' | 'redis' | 'krakend' | 'api' | 'postgres' | 'nats' | 'notify' | 'storage';

/** Centre of each box in the 560 × 410 drawing. The request path runs down the middle column. */
const NODES: Record<NodeId, { x: number; y: number }> = {
  browser: { x: 280, y: 30 },
  gateway: { x: 280, y: 100 },
  keycloak: { x: 90, y: 170 },
  bff: { x: 280, y: 170 },
  storage: { x: 470, y: 170 },
  redis: { x: 90, y: 240 },
  krakend: { x: 280, y: 240 },
  api: { x: 280, y: 310 },
  nats: { x: 470, y: 310 },
  postgres: { x: 280, y: 380 },
  notify: { x: 470, y: 380 },
};

const EDGES: { from: NodeId; to: NodeId; dashed?: boolean }[] = [
  { from: 'browser', to: 'gateway' },
  { from: 'gateway', to: 'bff' },
  { from: 'gateway', to: 'keycloak' },
  { from: 'bff', to: 'redis' },
  { from: 'bff', to: 'krakend' },
  { from: 'krakend', to: 'api' },
  { from: 'api', to: 'postgres' },
  { from: 'api', to: 'nats' },
  { from: 'nats', to: 'notify' },
  { from: 'browser', to: 'storage', dashed: true },
];

const W = 136;
const H = 36;

/**
 * The platform behind this site, drawn: a request travels down the middle column, an event leaves
 * the API through NATS. Hover, focus or tap a box to read its job (caption below, announced).
 * Fully rendered on the server; the dots stop for visitors who prefer reduced motion (globals.css).
 */
export function ArchitectureDiagram({
  label,
  hint,
  nodes,
}: {
  label: string;
  hint: string;
  nodes: Record<NodeId, { name: string; text: string }>;
}) {
  const [active, setActive] = useState<NodeId | null>(null);
  const captionId = useId();
  const linked = (edge: (typeof EDGES)[number]) => active !== null && (edge.from === active || edge.to === active);

  return (
    <figure className="w-full">
      <svg viewBox="0 0 560 410" role="group" aria-label={label} className="h-auto w-full select-none">
        {EDGES.map((edge) => {
          const a = NODES[edge.from];
          const b = NODES[edge.to];
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={linked(edge) ? 2 : 1}
              strokeDasharray={edge.dashed ? '4 5' : undefined}
              className={cn('transition-[stroke,opacity] duration-300', linked(edge) ? 'stroke-brand' : 'stroke-subtle', active && !linked(edge) && 'opacity-30')}
            />
          );
        })}

        <circle cx={280} cy={30} r={5} className="flow-request fill-brand" aria-hidden />
        <circle cx={280} cy={310} r={4} className="flow-event fill-fg" aria-hidden />

        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const { x, y } = NODES[id];
          const on = active === id;
          const dim = active !== null && !on && !EDGES.some((e) => (e.from === active && e.to === id) || (e.to === active && e.from === id));
          return (
            <g
              key={id}
              role="button"
              tabIndex={0}
              aria-label={nodes[id].name}
              aria-pressed={on}
              aria-describedby={captionId}
              onPointerEnter={() => setActive(id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(on ? null : id)}
              className={cn('cursor-pointer outline-none transition-opacity duration-300', dim && 'opacity-35')}
            >
              <rect
                x={x - W / 2}
                y={y - H / 2}
                width={W}
                height={H}
                rx={3}
                strokeWidth={on ? 1.5 : 1}
                className={cn('transition-colors duration-300', on ? 'fill-brand stroke-brand' : 'fill-bg stroke-fg')}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn('font-mono text-[12px] transition-colors duration-300', on ? 'fill-brand-fg' : 'fill-fg')}
              >
                {nodes[id].name}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption id={captionId} aria-live="polite" className="mt-4 min-h-12 border-l-2 border-brand pl-4 text-sm leading-relaxed text-muted">
        {active ? (
          <>
            <span className="font-mono text-fg">{nodes[active].name}</span> — {nodes[active].text}
          </>
        ) : (
          <>
            <span className="font-mono text-fg">{label}.</span> {hint}
          </>
        )}
      </figcaption>
    </figure>
  );
}
