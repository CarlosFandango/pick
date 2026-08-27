import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PayableList,
  type PayableRow,
  type PayoutRunRow,
  RunList,
} from '@/components/admin/PayoutRuns';

const payable = (over: Partial<PayableRow> = {}): PayableRow => ({
  auditId: 'a1',
  reference: 'PS-001',
  auditorName: 'M. Okafor',
  amountMinorUnits: 11_500,
  gate: 'auto_approve',
  ...over,
});

const run = (over: Partial<PayoutRunRow> = {}): PayoutRunRow => ({
  id: 'r1',
  reference: 'PR-00001',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  status: 'draft',
  totalMinorUnits: 23_000,
  lineCount: 2,
  externalReference: null,
  ...over,
});

describe('what is owed', () => {
  it('totals only what is actually going out', () => {
    // A held line must not be counted into a figure someone will act on.
    render(
      <PayableList
        payable={[
          payable({ auditId: 'a1' }),
          payable({ auditId: 'a2' }),
          payable({ auditId: 'a3', gate: 'hold' }),
        ]}
      />,
    );

    expect(screen.getByText(/2 ready · £230/)).toBeVisible();
    expect(screen.getByText(/1 held/)).toBeVisible();
  });

  it('shows a held audit rather than hiding it', () => {
    // An operator wondering why an auditor has not been paid needs to see the
    // hold is deliberate, not that the audit vanished.
    render(<PayableList payable={[payable({ gate: 'hold' })]} />);
    expect(screen.getByText('HELD FOR REVIEW')).toBeVisible();
  });

  it('itemises each audit at what it will pay', () => {
    render(<PayableList payable={[payable({ amountMinorUnits: 11_500 })]} />);
    expect(screen.getByText('£115')).toBeVisible();
  });

  it('says plainly when nothing is owed', () => {
    render(<PayableList payable={[]} />);
    expect(screen.getByText(/Nothing is owed right now/)).toBeVisible();
  });
});

describe('the runs', () => {
  it('shows what a run pays and how many audits it covers', () => {
    render(<RunList runs={[run()]} />);
    expect(screen.getByText(/2 audits/)).toBeVisible();
    expect(screen.getByText('£230')).toBeVisible();
  });

  it('carries the reference the money moved under, once executed', () => {
    // `executed` is a claim about the outside world this system cannot verify.
    // The reference is the only evidence it happened.
    render(<RunList runs={[run({ status: 'executed', externalReference: 'BACS-99' })]} />);
    expect(screen.getByText(/BACS-99/)).toBeVisible();
    expect(screen.getByText('EXECUTED')).toBeVisible();
  });

  it('says "1 audit", not "1 audits"', () => {
    render(<RunList runs={[run({ lineCount: 1 })]} />);
    expect(screen.getByText(/1 audit ·/)).toBeVisible();
  });

  it('renders the controls it is handed, per run', () => {
    render(
      <RunList
        runs={[run({ id: 'r9' })]}
        actions={(r) => <button type="button">Act on {r.id}</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Act on r9' })).toBeVisible();
  });

  it('says so when there are no runs', () => {
    render(<RunList runs={[]} />);
    expect(screen.getByText('No runs yet.')).toBeVisible();
  });
});
