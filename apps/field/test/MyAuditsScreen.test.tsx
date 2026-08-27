import { pickselLight } from '@picksel/tokens';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type MyAuditRow, MyAuditsScreen } from '../src/components/MyAuditsScreen';

let seq = 0;
const audit = (over: Partial<MyAuditRow> = {}): MyAuditRow => {
  seq += 1;
  return {
    id: `a${seq}`,
    title: 'Street · SE15',
    dateLabel: 'Tue 3 Mar',
    feeMinorUnits: 11500,
    status: 'in_review',
    ...over,
  };
};

describe('S2.5 my audits', () => {
  it('lists an audit with its date and fee', () => {
    render(<MyAuditsScreen audits={[audit()]} />);
    expect(screen.getByText('Street · SE15')).toBeInTheDocument();
    expect(screen.getByText('Tue 3 Mar · £115')).toBeInTheDocument();
    expect(screen.getByText('IN REVIEW')).toBeInTheDocument();
  });

  it('tells the auditor what they owe rather than naming a database state', () => {
    render(<MyAuditsScreen audits={[audit({ status: 'assigned' })]} />);
    expect(screen.getByText('WRITE-UP DUE')).toBeInTheDocument();
  });

  it('treats no team present as a completed job, paid in full', () => {
    render(
      <MyAuditsScreen audits={[audit({ status: 'no_team_present', extra: 'paid in full' })]} />,
    );

    expect(screen.getByText('NO TEAM PRESENT')).toBeInTheDocument();
    expect(screen.getByText('Tue 3 Mar · £115 · paid in full')).toBeInTheDocument();
    expect(screen.getByText(/never against your record/)).toBeInTheDocument();
  });

  it('never renders a status in the fail colour', () => {
    const { container } = render(
      <MyAuditsScreen
        audits={[
          audit({ status: 'no_team_present' }),
          audit({ status: 'cancelled' }),
          audit({ status: 'released' }),
        ]}
      />,
    );
    // An audit's status is never the auditor failing. Read from the theme, not
    // written out: a hex pinned in a test breaks on the next rebrand, which is
    // exactly when these tests need to still mean something.
    expect(container.innerHTML.toUpperCase()).not.toContain(
      pickselLight.colors.danger.toUpperCase(),
    );
  });

  it('shows an approved audit with its score', () => {
    render(<MyAuditsScreen audits={[audit({ status: 'released', extra: '44/46' })]} />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Tue 3 Mar · £115 · 44/46')).toBeInTheDocument();
  });

  it('says something when the list is empty', () => {
    render(<MyAuditsScreen audits={[]} />);
    expect(screen.getByText('Nothing yet. Accepted offers appear here.')).toBeInTheDocument();
  });
});

describe('picking up a job', () => {
  it('makes a row tappable when there is somewhere to go', async () => {
    // Rows were not tappable at all until the app got navigation (TND-88):
    // My Audits is where an auditor picks up work and it led nowhere.
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<MyAuditsScreen audits={[audit({ title: 'Street · SE15' })]} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: /Street · SE15/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('is not a button when nothing is handed to it', () => {
    // A row that looks tappable and does nothing is worse than a plain row.
    render(<MyAuditsScreen audits={[audit()]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
