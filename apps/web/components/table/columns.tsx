'use client';

import { createColumnHelper } from '@tanstack/react-table';
import {
  EM_DASH,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  type HoldingRow,
} from '@portfolio/shared';
import { GainLossCell } from './GainLossCell';
import { StaleBadge } from '@/components/ui/StaleBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { PriceCell } from './PriceCell';

const helper = createColumnHelper<HoldingRow>();

export const portfolioColumns = [
  helper.accessor('name', {
    id: 'name',
    header: 'Particulars',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    meta: { align: 'left', sticky: true, width: 'w-56' },
  }),
  helper.accessor('purchasePrice', {
    header: 'Purchase price',
    cell: (info) => formatCurrency(info.getValue()),
    meta: { align: 'right', width: 'w-28' },
  }),
  helper.accessor('quantity', {
    header: 'Qty',
    cell: (info) => formatQuantity(info.getValue()),
    meta: { align: 'right', width: 'w-16' },
  }),
  helper.accessor('investment', {
    header: 'Investment',
    cell: (info) => formatCurrency(info.getValue()),
    meta: { align: 'right', width: 'w-32' },
  }),
  helper.accessor('portfolioPercent', {
    header: 'Portfolio',
    cell: (info) => formatPercent(info.getValue()),
    meta: { align: 'right', width: 'w-20' },
  }),
  helper.accessor('exchangeCode', {
    header: 'NSE/BSE',
    cell: (info) => (
      <span className="flex items-center justify-end gap-1.5">
        <span className="numeric">{info.getValue()}</span>
        <span className="rounded-sm border border-rule px-1 text-[0.6rem] tracking-wide text-ink-faint">
          {info.row.original.exchange}
        </span>
      </span>
    ),
    meta: { align: 'right', width: 'w-28' },
  }),
  helper.accessor('cmp', {
    header: 'CMP',
    cell: (info) => (
      <PriceCell
        price={info.getValue()}
        dayChangePercent={info.row.original.dayChangePercent}
        status={info.row.original.status.quote}
      />
    ),
    meta: { align: 'right', width: 'w-28' },
  }),
  helper.accessor('presentValue', {
    header: 'Present value',
    cell: (info) => formatCurrency(info.getValue()),
    meta: { align: 'right', width: 'w-32' },
  }),
  helper.accessor('gainLoss', {
    header: 'Gain / loss',
    cell: (info) => (
      <GainLossCell value={info.getValue()} percent={info.row.original.gainLossPercent} />
    ),
    meta: { align: 'right', width: 'w-32' },
  }),
  helper.accessor('peRatio', {
    header: 'P/E ratio',
    cell: (info) => (
      <span className="numeric">
        {formatNumber(info.getValue())}
        <StaleBadge status={info.row.original.status.fundamentals} />
      </span>
    ),
    meta: { align: 'right', width: 'w-24' },
  }),
  helper.accessor((row) => row.latestEarnings?.eps ?? null, {
    id: 'latestEarnings',
    header: 'Latest earnings',
    cell: (info) => {
      const earnings = info.row.original.latestEarnings;
      if (!earnings || earnings.eps === null) return <span className="numeric">{EM_DASH}</span>;

      const label =
        earnings.netIncome === null
          ? `Earnings per share for ${earnings.period ?? 'the latest quarter'}`
          : `Net income ${formatCompactCurrency(earnings.netIncome)} for ${earnings.period ?? 'the latest quarter'}`;

      return (
        <Tooltip label={label}>
          <span className="numeric inline-flex flex-col items-end leading-tight">
            <span>{formatCurrency(earnings.eps)}</span>
            <span className="text-[0.7rem] text-ink-faint">{earnings.period ?? EM_DASH}</span>
          </span>
        </Tooltip>
      );
    },
    meta: { align: 'right', width: 'w-32' },
  }),
];
