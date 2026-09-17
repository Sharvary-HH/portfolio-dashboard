'use client';

import { memo, useId } from 'react';

interface SparklineProps {
  values: number[];
  tone: 'gain' | 'loss' | 'neutral';
  className?: string;
}

const STROKE: Record<SparklineProps['tone'], string> = {
  gain: 'var(--gain)',
  loss: 'var(--loss)',
  neutral: 'var(--brand)',
};

function SparklineBase({ values, tone, className }: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) return <div className={className} />;

  const width = 100;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * (height - 6) - 3;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Recent trend"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={STROKE[tone]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={STROKE[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={STROKE[tone]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export const Sparkline = memo(SparklineBase);
