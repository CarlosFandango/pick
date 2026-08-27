import type { OfferListItem } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OffersScreen } from '../src/components/OffersScreen';

const NOW = new Date('2026-03-01T10:00:00Z');
const noop = () => undefined;

let seq = 0;
const offer = (over: Partial<OfferListItem> = {}): OfferListItem => {
  seq += 1;
  return {
    id: `o${seq}`,
    auditTypeLabel: 'Street',
    areaLabel: 'SE15 — Peckham',
    windowLabel: 'Tue 3 – Thu 5 Mar',
    paymentMethodLabel: 'direct debit',
    baseMinorUnits: 10000,
    travelMinorUnits: 1500,
    expiresAt: new Date('2026-03-03T08:00:00Z'),
    outcome: 'offered',
    ...over,
  };
};

const view = (offers: OfferListItem[], onView = noop) => (
  <OffersScreen offers={offers} now={NOW} whoAndArea="M. Okafor · SE London" onView={onView} />
);

describe('S2.1 offers', () => {
  it('shows total pay with the uplift called out separately', () => {
    render(view([offer()]));
    expect(screen.getByText('£115')).toBeInTheDocument();
    expect(screen.getByText('incl. £15 travel uplift')).toBeInTheDocument();
  });

  it('marks an offer that is about to go', () => {
    render(view([offer({ expiresAt: new Date('2026-03-01T16:00:00Z') })]));
    expect(screen.getByText('EXPIRING')).toBeInTheDocument();
    expect(screen.getByText('6H LEFT')).toBeInTheDocument();
  });

  it('keeps a filled offer visible so the network never looks silent', () => {
    render(view([offer({ outcome: 'withdrawn' })]));

    expect(screen.getByText('FILLED')).toBeInTheDocument();
    expect(screen.getByText('Accepted by another auditor. No action needed.')).toBeInTheDocument();
    // Nothing to do with it, so nothing to press.
    expect(screen.queryByRole('button', { name: /View/ })).toBeNull();
  });

  it('drops offers that are simply gone', () => {
    render(view([offer({ outcome: 'declined', areaLabel: 'CR0 — Croydon' })]));
    expect(screen.queryByText(/Croydon/)).toBeNull();
  });

  it('puts the most urgent offer first', () => {
    const soon = offer({ areaLabel: 'CR0 — Croydon', expiresAt: new Date('2026-03-01T14:00:00Z') });
    const later = offer({ areaLabel: 'SE15 — Peckham' });

    render(view([later, soon]));
    const headings = screen.getAllByText(/Street ·/);
    expect(headings[0]).toHaveTextContent('Croydon');
  });

  it('opens an offer', async () => {
    const onView = vi.fn();
    render(view([offer()], onView));

    await userEvent.click(screen.getByRole('button', { name: 'View Street in SE15 — Peckham' }));
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ areaLabel: 'SE15 — Peckham' }));
  });

  it('says something when there is nothing, rather than showing an empty screen', () => {
    render(view([]));
    expect(screen.getByText('No offers right now. We will let you know.')).toBeInTheDocument();
  });

  it('never shows an address before the offer is accepted', () => {
    render(view([offer()]));
    // Area only. The pitch is withheld until the audit is assigned.
    expect(screen.getByText('Street · SE15 — Peckham')).toBeInTheDocument();
    expect(screen.queryByText(/entrance|street name|no\.\s?\d/i)).toBeNull();
  });
});
