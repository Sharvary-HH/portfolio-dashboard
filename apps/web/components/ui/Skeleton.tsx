const COLUMN_WIDTHS = [
  'w-32',
  'w-20',
  'w-12',
  'w-24',
  'w-16',
  'w-20',
  'w-20',
  'w-24',
  'w-24',
  'w-14',
  'w-20',
];

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse border border-rule bg-surface" aria-hidden>
      <div className="flex gap-4 border-b border-rule px-4 py-3">
        {COLUMN_WIDTHS.map((width) => (
          <div key={width} className={`h-3 rounded-sm bg-sunken ${width}`} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-4 border-b border-rule px-4 py-3 last:border-b-0">
          {COLUMN_WIDTHS.map((width) => (
            <div key={width} className={`h-3 rounded-sm bg-sunken ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
