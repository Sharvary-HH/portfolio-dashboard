'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { logoSources } from '@/lib/logos';
import { TickerAvatar } from './TickerAvatar';
import { cn } from '@/lib/cn';

interface CompanyLogoProps {
  holdingId: string;
  name: string;
  className?: string;
  size?: number;
}

function CompanyLogoBase({ holdingId, name, className, size = 32 }: CompanyLogoProps) {
  const sources = logoSources(holdingId);
  const [attempt, setAttempt] = useState(0);
  const source = sources[attempt];

  if (!source) return <TickerAvatar name={name} className={className} />;

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-xl border border-rule bg-white',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={source}
        alt=""
        width={size - 8}
        height={size - 8}
        unoptimized
        onError={() => setAttempt((current) => current + 1)}
        className="object-contain"
      />
    </span>
  );
}

export const CompanyLogo = memo(CompanyLogoBase);
