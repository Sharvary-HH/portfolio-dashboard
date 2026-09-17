import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GainLossCell, directionOf } from '@/components/table/GainLossCell';

describe('directionOf', () => {
  it('classifies gains, losses and missing values', () => {
    expect(directionOf(120)).toBe('up');
    expect(directionOf(-120)).toBe('down');
    expect(directionOf(0)).toBe('flat');
    expect(directionOf(null)).toBe('unknown');
    expect(directionOf(Number.NaN)).toBe('unknown');
  });
});

describe('GainLossCell', () => {
  it('marks a gain green with a plus sign and an up arrow', () => {
    const { container } = render(<GainLossCell value={10507.5} percent={14.1} />);
    const cell = container.firstElementChild;

    expect(cell).toHaveClass('text-gain');
    expect(cell?.textContent).toContain('▲');
    expect(screen.getByText(/\+14\.10%/)).toBeInTheDocument();
  });

  it('marks a loss red with a minus sign and a down arrow', () => {
    const { container } = render(<GainLossCell value={-8643.6} percent={-13.19} />);
    const cell = container.firstElementChild;

    expect(cell).toHaveClass('text-loss');
    expect(cell?.textContent).toContain('▼');
    expect(screen.getByText(/−13\.19%/)).toBeInTheDocument();
  });

  it('renders a dash when the value is unknown', () => {
    render(<GainLossCell value={null} percent={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hides the percentage in compact mode', () => {
    render(<GainLossCell value={2000} percent={10} compact />);
    expect(screen.queryByText(/10\.00%/)).not.toBeInTheDocument();
  });
});
