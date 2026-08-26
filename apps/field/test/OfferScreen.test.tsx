import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfferScreen, type OfferView } from '../src/components/OfferScreen';

const NOW = new Date('2026-03-01T10:00:00Z');

function anOffer(over: Partial<OfferView> = {}): OfferView {
  return {
    auditTypeLabel: 'Street audit',
    paymentMethodLabel: 'Direct debit',
    postcodeOutward: 'SE15',
    locality: 'Peckham',
    windowStart: new Date('2026-03-03T00:00:00Z'),
    windowEnd: new Date('2026-03-05T00:00:00Z'),
    expiresAt: new Date('2026-03-03T08:00:00Z'),
    pay: [
      { label: 'audit', minorUnits: 10000 },
      { label: 'travel uplift', minorUnits: 1500 },
    ],
    ...over,
  };
}

const noop = () => undefined;

describe('S1.3 job offer', () => {
  it('shows the area and never the exact pitch', () => {
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={noop} />);

    expect(screen.getByText('SE15 — Peckham')).toBeInTheDocument();
    expect(screen.getByText('Exact pitch shared after accepting')).toBeInTheDocument();
    // An auditor who declines must not learn where the team will be.
    expect(screen.queryByText(/entrance|street name|outside the/i)).toBeNull();
  });

  it('shows total pay in full, itemised, before accepting', () => {
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={noop} />);

    expect(screen.getByText('£115')).toBeInTheDocument();
    expect(screen.getByText('£100 audit + £15 travel uplift')).toBeInTheDocument();
    expect(screen.getByText('Shown in full before you accept.')).toBeInTheDocument();
  });

  it('counts down to expiry', () => {
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={noop} />);
    expect(screen.getByText(/NEW OFFER · EXPIRES IN 46H/)).toBeInTheDocument();
  });

  it('says the shift can be any day in the window', () => {
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={noop} />);
    expect(screen.getByText('Tue 3 – Thu 5 March')).toBeInTheDocument();
    expect(screen.getByText('Any one shift in the window')).toBeInTheDocument();
  });

  it('accepts', async () => {
    const onAccept = vi.fn();
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={onAccept} onDecline={noop} />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept offer' }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('declines without making it feel like a failure', async () => {
    const onDecline = vi.fn();
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={onDecline} />);

    // "Not this time" — declining is normal in an offer-based marketplace.
    await userEvent.click(screen.getByRole('button', { name: 'Not this time' }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('cannot be double-submitted while a response is in flight', async () => {
    const onAccept = vi.fn();
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={onAccept} onDecline={noop} busy />);

    // pointerEventsCheck off so the click is genuinely attempted: this asserts
    // the handler is inert, not merely that the element looks unclickable.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('button', { name: 'Accept offer' }));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('renders a pay total with no travel uplift', () => {
    render(
      <OfferScreen
        offer={anOffer({ pay: [{ label: 'audit', minorUnits: 10000 }] })}
        now={NOW}
        onAccept={noop}
        onDecline={noop}
      />,
    );
    expect(screen.getByText('£100')).toBeInTheDocument();
    expect(screen.getByText('£100 audit')).toBeInTheDocument();
  });

  it('reads the total out to a screen reader as money, not a bare number', () => {
    render(<OfferScreen offer={anOffer()} now={NOW} onAccept={noop} onDecline={noop} />);
    expect(screen.getByLabelText('Total pay £115')).toBeInTheDocument();
  });
});
