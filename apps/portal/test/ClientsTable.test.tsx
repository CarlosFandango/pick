import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type ClientRow, ClientsTable } from '@/components/admin/ClientsTable';

const client = (over: Partial<ClientRow> = {}): ClientRow => ({
  organisationId: 'c1',
  name: "St Luke's Hospice",
  residencyZone: 'uk',
  charityNumber: '1012345',
  isActive: true,
  balance: 4,
  auditsBooked: 6,
  auditsReleased: 2,
  ...over,
});

describe('the client roster', () => {
  it('shows residency, which is captured everywhere and read nowhere else', () => {
    render(<ClientsTable clients={[client({ residencyZone: 'eea' })]} />);
    expect(screen.getByText('EEA')).toBeVisible();
  });

  it('shows the balance as a number a charity could add up themselves', () => {
    render(<ClientsTable clients={[client({ balance: 17 })]} />);
    const row = screen.getByRole('row', { name: /St Luke/ });
    expect(within(row).getByText('17')).toBeVisible();
  });

  it('marks a charity that is no longer active', () => {
    render(<ClientsTable clients={[client({ isActive: false })]} />);
    expect(screen.getByText('INACTIVE')).toBeVisible();
  });

  it('renders the controls it is handed, per charity', () => {
    render(
      <ClientsTable
        clients={[client({ organisationId: 'c9' })]}
        actions={(c) => <button type="button">Adjust {c.organisationId}</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Adjust c9' })).toBeVisible();
  });

  it('says so when there are no charities', () => {
    render(<ClientsTable clients={[]} />);
    expect(screen.getByText(/No charities on the platform yet/)).toBeVisible();
  });
});
