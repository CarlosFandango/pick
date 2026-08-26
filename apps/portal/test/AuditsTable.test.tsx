import type { AuditStatus } from '@picksel/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type AdminAuditRow, AuditsTable } from '@/components/admin/AuditsTable';

let seq = 0;
const audit = (over: Partial<AdminAuditRow> = {}): AdminAuditRow => {
  seq += 1;
  return {
    id: `a${seq}`,
    reference: `PS-00${seq}`,
    status: 'booked' as AuditStatus,
    auditTypeLabel: 'Street',
    charityName: "St Luke's Hospice",
    postcode: 'SE15 4QL',
    windowStartOn: '2026-09-02',
    windowEndOn: '2026-09-05',
    ...over,
  };
};

describe('the admin audits list', () => {
  it('says what every column is', () => {
    render(<AuditsTable audits={[audit()]} />);
    for (const heading of ['Reference', 'Charity', 'Type', 'Location', 'Window', 'Status']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  it('offers Assign only where an audit still needs an auditor', () => {
    // Offering it on an assigned audit would be a second, contradictory way to
    // do the same thing, and the console refuses anyway.
    render(
      <AuditsTable
        audits={[
          audit({ status: 'booked' as AuditStatus }),
          audit({ status: 'released' as AuditStatus }),
          audit({ status: 'in_review' as AuditStatus }),
        ]}
      />,
    );

    expect(screen.getAllByRole('link', { name: 'Assign' })).toHaveLength(1);
  });

  it('points Assign at the console and the reference at the audit', () => {
    render(<AuditsTable audits={[audit({ id: 'abc' })]} />);

    expect(screen.getByRole('link', { name: 'Assign' })).toHaveAttribute(
      'href',
      '/admin/assignment/abc',
    );
    expect(screen.getByRole('link', { name: /PS-/ })).toHaveAttribute('href', '/admin/audits/abc');
  });

  it('shows status as a labelled pill, never colour alone', () => {
    render(<AuditsTable audits={[audit({ status: 'no_team_present' as AuditStatus })]} />);
    const row = screen.getByRole('row', { name: /NO TEAM PRESENT/ });
    expect(within(row).getByText('NO TEAM PRESENT')).toBeVisible();
  });

  it('says so plainly when there is nothing booked', () => {
    render(<AuditsTable audits={[]} />);
    expect(screen.getByText(/Nothing booked yet/)).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
