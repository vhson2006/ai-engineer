import type { NailPattern } from '@/content/salon';

/**
 * A set of five almond nails drawn in SVG: stands in for photos until the salon uploads its own
 * (they will come from object storage). Decorative unless a `label` is given.
 */
const FAN = [
  { x: 22, h: 54, r: -14 },
  { x: 60, h: 66, r: -6 },
  { x: 100, h: 72, r: 0 },
  { x: 140, h: 66, r: 6 },
  { x: 178, h: 50, r: 14 },
];
const W = 28;

function nailPath(h: number) {
  const shoulder = h * 0.42;
  return `M0 ${h} L0 ${shoulder} C0 ${h * 0.14} ${W * 0.28} 0 ${W / 2} 0 C${W * 0.72} 0 ${W} ${h * 0.14} ${W} ${shoulder} L${W} ${h} Q${W / 2} ${h + 5} 0 ${h} Z`;
}

export function NailArt({
  id,
  pattern,
  base,
  accent,
  label,
  className,
}: {
  /** Unique per page: prefixes the SVG gradient and clip ids. */
  id: string;
  pattern: NailPattern;
  base: string;
  accent: string;
  label?: string;
  className?: string;
}) {
  const gradient = `${id}-g`;
  const fill = pattern === 'chrome' || pattern === 'ombre' ? `url(#${gradient})` : base;
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        {pattern === 'chrome' && (
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={base} />
            <stop offset="0.45" stopColor={accent} />
            <stop offset="0.6" stopColor="#d9d3e8" />
            <stop offset="1" stopColor={base} />
          </linearGradient>
        )}
        {pattern === 'ombre' && (
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} />
            <stop offset="1" stopColor={base} />
          </linearGradient>
        )}
        {FAN.map((nail, index) => (
          <clipPath key={index} id={`${id}-c${index}`}>
            <path d={nailPath(nail.h)} />
          </clipPath>
        ))}
      </defs>
      <ellipse cx="100" cy="114" rx="92" ry="5" fill="currentColor" opacity="0.08" />
      {FAN.map((nail, index) => (
        <g key={index} transform={`translate(${nail.x - W / 2} ${110 - nail.h}) rotate(${nail.r} ${W / 2} ${nail.h})`}>
          <path d={nailPath(nail.h)} fill={fill} stroke="rgb(0 0 0 / 0.08)" strokeWidth="0.8" />
          <g clipPath={`url(#${id}-c${index})`}>
            <Decoration pattern={pattern} accent={accent} h={nail.h} index={index} />
            <path
              d={`M${W * 0.22} ${nail.h * 0.62} C${W * 0.2} ${nail.h * 0.3} ${W * 0.3} ${nail.h * 0.14} ${W * 0.42} ${nail.h * 0.1}`}
              stroke="#fff"
              strokeOpacity="0.75"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

const DOTS = [
  [7, 0.25],
  [19, 0.38],
  [9, 0.55],
  [20, 0.7],
  [12, 0.85],
];

function Decoration({ pattern, accent, h, index }: { pattern: NailPattern; accent: string; h: number; index: number }) {
  switch (pattern) {
    case 'french':
      return (
        <path
          d={`M-2 ${h * 0.3} C${W * 0.25} ${h * 0.16} ${W * 0.75} ${h * 0.16} ${W + 2} ${h * 0.3} L${W + 2} -2 L-2 -2 Z`}
          fill={accent}
        />
      );
    case 'dots':
      return (
        <g fill={accent}>
          {DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={h * y} r={2.4} />
          ))}
        </g>
      );
    case 'flower':
      // Flowers on two accent nails, the others plain (a typical accent-nail set).
      if (index % 2 === 0) return null;
      return (
        <g transform={`translate(${W / 2} ${h * 0.45})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} cx="0" cy="-5" rx="3.2" ry="5" fill={accent} transform={`rotate(${angle})`} />
          ))}
          <circle r="2.4" fill="#f7d774" />
        </g>
      );
    case 'line':
      return (
        <path
          d={`M${W * 0.15} ${h} C${W * 0.6} ${h * 0.7} ${W * 0.3} ${h * 0.35} ${W * 0.85} ${h * 0.05}`}
          stroke={accent}
          strokeWidth="1.6"
          fill="none"
        />
      );
    default:
      return null;
  }
}
