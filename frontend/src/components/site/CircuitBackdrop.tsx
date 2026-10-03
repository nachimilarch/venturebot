// The VaartaBot circuit motif: a few traces with dot terminals and 45° chamfers,
// the same drawing language as the logo's वा and the Milarch M. Decorative only.
import React from 'react';

type Props = {
  className?: string;
  color?: string;
  opacity?: number;
};

const TRACES = [
  { d: 'M620 60 H760 L800 100 H1240', dot: [620, 60] },
  { d: 'M700 170 H820 L860 130 H1240', dot: [700, 170] },
  { d: 'M660 300 H880 L920 340 H1240', dot: [660, 300] },
  { d: 'M760 420 H940 L980 380 H1240', dot: [760, 420] },
  { d: 'M820 520 H1000 L1040 560 H1240', dot: [820, 520] },
];

const CircuitBackdrop: React.FC<Props> = ({ className = '', color = '#2DB8C1', opacity = 0.18 }) => (
  <svg
    className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    viewBox="0 0 1200 600"
    preserveAspectRatio="xMaxYMid slice"
    aria-hidden="true"
    style={{ opacity }}
  >
    {TRACES.map(t => (
      <g key={t.d}>
        <path d={t.d} fill="none" stroke={color} strokeWidth={3} />
        <circle cx={t.dot[0]} cy={t.dot[1]} r={7} fill={color} />
      </g>
    ))}
  </svg>
);

export default CircuitBackdrop;
