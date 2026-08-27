import type { EarningLine } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EarningsScreen } from '../src/components/EarningsScreen';

let seq = 0;
const line = (over: Partial<EarningLine> = {}): EarningLine => {
  seq += 1;
  return {
    auditId: `a${seq}`,
    title: 'Street · SE15',
    dateLabel: 'Tue 3 Mar',
    baseMinorUnits: 10000,
    travelMinorUnits: 1500,
    state: 'pending',
    ...over,
  };
};

const NEXT_RUN = new Date('2026-03-06T00:00:00Z');

describe('S2.6 earnings', () => {
  it('leads with what is owed and when it arrives', () => {
    render(
      <EarningsScreen lines={[line(), line({ travelMinorUnits: 2200 })]} nextRun={NEXT_RUN} />,
    );

    expect(screen.getByText('PENDING — NEXT RUN FRI 6 MAR')).toBeInTheDocument();
    expect(screen.getByLabelText('Pending £237')).toBeInTheDocument();
  });

  it('names the travel uplift in the total and on every line', () => {
    render(<EarningsScreen lines={[line()]} nextRun={NEXT_RUN} />);

    // Itemised always: an auditor should be able to see what each part is for.
    expect(screen.getByText('1 audit · incl. £15 travel uplift')).toBeInTheDocument();
    expect(screen.getByText('Tue 3 Mar · £100 audit + £15 travel')).toBeInTheDocument();
  });

  it('leaves travel off a line that had none', () => {
    render(<EarningsScreen lines={[line({ travelMinorUnits: 0 })]} nextRun={NEXT_RUN} />);
    expect(screen.getByText('Tue 3 Mar · £100 audit')).toBeInTheDocument();
  });

  it('separates paid from pending', () => {
    render(
      <EarningsScreen
        lines={[line(), line({ state: 'paid', travelMinorUnits: 0 })]}
        nextRun={NEXT_RUN}
      />,
    );

    expect(screen.getByText('PAID')).toBeInTheDocument();
    // Only the unpaid one counts toward the pending total.
    expect(screen.getByLabelText('Pending £115')).toBeInTheDocument();
  });

  it('does not invent a payout date it does not have', () => {
    render(<EarningsScreen lines={[line()]} nextRun={null} />);
    // The point is the absence of a promised date, not the word "pending",
    // which also appears on each unpaid line.
    expect(screen.queryByText(/NEXT RUN/)).toBeNull();
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
  });

  it('shows zero rather than a blank when nothing is owed', () => {
    render(<EarningsScreen lines={[]} nextRun={NEXT_RUN} />);
    expect(screen.getByLabelText('Pending £0')).toBeInTheDocument();
  });
});
