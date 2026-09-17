'use client';

import { ChartPie, LayoutDashboard, Layers, Table2, TrendingUp, Wallet } from 'lucide-react';
import { formatCompactCurrency } from '@portfolio/shared';
import { cn } from '@/lib/cn';

export type SectionId = 'overview' | 'holdings' | 'sectors' | 'movers';

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'holdings', label: 'Holdings', icon: Table2 },
  { id: 'sectors', label: 'Sectors', icon: ChartPie },
  { id: 'movers', label: 'Movers', icon: TrendingUp },
];

interface SidebarProps {
  active: SectionId;
  onSelect: (section: SectionId) => void;
  totalValue: number | null;
  holdingCount: number;
}

export function Sidebar({ active, onSelect, totalValue, holdingCount }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-rail px-4 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-rail-active text-sm font-bold text-white">
          PD
        </span>
        <span className="font-display text-sm font-bold tracking-tight text-white">
          Portfolio desk
        </span>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 px-3 py-3">
        <p className="flex items-center gap-1.5 text-[0.7rem] text-rail-ink">
          <Wallet aria-hidden className="size-3.5" />
          Portfolio value
        </p>
        <p className="numeric mt-1 font-display text-lg font-bold text-white">
          {formatCompactCurrency(totalValue)}
        </p>
        <p className="numeric text-[0.7rem] text-rail-ink">{holdingCount} holdings</p>
      </div>

      <nav className="mt-6 flex flex-col gap-1" aria-label="Sections">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === active;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-rail-active font-medium text-white'
                  : 'text-rail-ink hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon aria-hidden className="size-4" />
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-start gap-2 rounded-2xl bg-white/5 px-3 py-3 text-[0.7rem] leading-relaxed text-rail-ink">
        <Layers aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <p>Prices from Yahoo Finance, fundamentals from Google Finance. Not investment advice.</p>
      </div>
    </aside>
  );
}
