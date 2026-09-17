'use client';

import { useEffect, useState } from 'react';
import { formatClockTime } from '@portfolio/shared';
import { useMounted } from '@/hooks/useMounted';

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function LiveClock({ lastUpdated }: { lastUpdated: Date | null }) {
  const mounted = useMounted();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden text-right leading-tight sm:block">
      <p className="numeric text-base font-medium">
        {mounted && now ? formatClockTime(now) : '--:--:--'}
      </p>
      <p className="numeric text-[0.65rem] text-ink-faint">
        {mounted && now ? DATE_FORMAT.format(now) : ''}
        {lastUpdated ? ` · data ${formatClockTime(lastUpdated)}` : ''}
      </p>
    </div>
  );
}
