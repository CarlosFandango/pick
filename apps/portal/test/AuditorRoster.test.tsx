import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditorRoster, type AuditorRow } from '@/components/admin/AuditorRoster';

let seq = 0;
const auditor = (over: Partial<AuditorRow> = {}): AuditorRow => {
  seq += 1;
  return {
    auditorId: `u${seq}`,
    fullName: `Auditor ${seq}`,
    approvalStatus: 'approved',
    basePostcode: 'SE15 4QL',
    avCapable: false,
    areas: ['SE', 'SW'],
    methodologies: ['Street'],
    auditsCompleted: 4,
    openConflicts: 0,
    ...over,
  };
};

describe('the auditor roster', () => {
  it('puts anyone awaiting vetting first — it is a queue before a directory', () => {
    // An unapproved auditor is never offered anything, so nothing in the
    // network moves until someone looks here.
    render(
      <AuditorRoster
        auditors={[
          auditor({ fullName: 'Approved One', approvalStatus: 'approved' }),
          auditor({ fullName: 'Waiting One', approvalStatus: 'pending' }),
        ]}
      />,
    );

    const names = screen.getAllByText(/One$/).map((n) => n.textContent);
    expect(names[0]).toBe('Waiting One');
  });

  it('surfaces a declared conflict, which explains why someone is idle', () => {
    render(<AuditorRoster auditors={[auditor({ openConflicts: 2 })]} />);
    expect(screen.getByText(/2 declared conflict/)).toBeVisible();
  });

  it('says when coverage or capability is unset, rather than showing nothing', () => {
    // An auditor with no areas is invisible to matching and looks approved.
    render(<AuditorRoster auditors={[auditor({ areas: [], methodologies: [] })]} />);
    expect(screen.getAllByText('none set')).toHaveLength(2);
  });

  it('renders whatever controls it is handed, per auditor', () => {
    render(
      <AuditorRoster
        auditors={[auditor({ auditorId: 'x1' }), auditor({ auditorId: 'x2' })]}
        actions={(a) => <button type="button">Act on {a.auditorId}</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Act on x1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Act on x2' })).toBeVisible();
  });

  it('explains an empty network rather than looking broken', () => {
    render(<AuditorRoster auditors={[]} />);
    expect(screen.getByText(/Nobody has applied yet/)).toBeVisible();
  });
});
