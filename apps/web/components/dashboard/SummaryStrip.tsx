import {
  formatCurrency,
  formatQuantity,
  formatSignedPercent,
  type PortfolioResponse,
} from '@portfolio/shared';
import { GainLossCell } from '@/components/table/GainLossCell';

interface SummaryStripProps {
  totals: PortfolioResponse['totals'];
  holdingCount: number;
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 first:pl-0">
      <span className="text-[0.7rem] tracking-wide text-ink-faint">{label}</span>
      <span className="numeric text-base">{children}</span>
    </div>
  );
}

export function SummaryStrip({ totals, holdingCount }: SummaryStripProps) {
  return (
    <section
      aria-label="Portfolio summary"
      className="flex flex-wrap divide-x divide-rule border-b border-rule"
    >
      <Item label="Total investment">{formatCurrency(totals.totalInvestment)}</Item>
      <Item label="Present value">{formatCurrency(totals.totalPresentValue)}</Item>
      <Item label="Gain / loss">
        <GainLossCell value={totals.gainLoss} percent={totals.gainLossPercent} compact />
      </Item>
      <Item label="Return">{formatSignedPercent(totals.gainLossPercent)}</Item>
      <Item label="Holdings">{formatQuantity(holdingCount)}</Item>
    </section>
  );
}
