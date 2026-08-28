import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type HomeAudit, type HomePayment, HomeScreen } from '../src/components/HomeScreen';

let seq = 0;
const job = (over: Partial<HomeAudit> = {}): HomeAudit => {
  seq += 1;
  return {
    id: `a${seq}`,
    title: 'Street · SE15',
    dateLabel: 'Tue 3 – Thu 5 March',
    area: 'SE15',
    windowLabel: null,
    status: 'assigned',
    action: 'Prep',
    ...over,
  };
};

const payment = (over: Partial<HomePayment> = {}): HomePayment => ({
  auditId: 'p1',
  title: 'Street · N1',
  dateLabel: 'Mon 2 February',
  state: 'cleared',
  stateLabel: 'Cleared for payment',
  amountMinorUnits: 11500,
  reference: null,
  ...over,
});

describe('S5.3 home — what an auditor sees on opening', () => {
  it('leads with the next audit', () => {
    render(<HomeScreen next={job()} upcoming={[]} payments={[]} />);
    expect(screen.getByText('NEXT AUDIT')).toBeInTheDocument();
    expect(screen.getByText('Street · SE15')).toBeInTheDocument();
    expect(screen.getByText('Tue 3 – Thu 5 March')).toBeInTheDocument();
  });

  it('puts what is due one tap away', async () => {
    // An auditor reads prep on the way to a pitch. Two taps and a load is a
    // different screen from the one they need.
    const onOpen = vi.fn();
    const next = job();
    render(<HomeScreen next={next} upcoming={[]} payments={[]} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /Prep for Street · SE15/ }));
    expect(onOpen).toHaveBeenCalledWith(next);
  });

  it('offers the write-up, not prep, once the shift has started', () => {
    render(
      <HomeScreen
        next={job({ status: 'in_progress', action: 'Write up' })}
        upcoming={[]}
        payments={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /Write up/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prep/ })).not.toBeInTheDocument();
  });

  it('offers nothing to tap when there is nothing to do', () => {
    render(<HomeScreen next={job({ action: null })} upcoming={[]} payments={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says so plainly when there is no work, rather than showing an empty card', () => {
    render(<HomeScreen next={null} upcoming={[]} payments={[]} />);
    expect(screen.getByText(/Nothing booked in/)).toBeInTheDocument();
  });

  it('lists everything else under coming up', () => {
    render(
      <HomeScreen
        next={job()}
        upcoming={[job({ title: 'Door-to-door · M4' }), job({ title: 'Lottery · EH2' })]}
        payments={[]}
      />,
    );
    expect(screen.getByText('COMING UP')).toBeInTheDocument();
    expect(screen.getByText('Door-to-door · M4')).toBeInTheDocument();
    expect(screen.getByText('Lottery · EH2')).toBeInTheDocument();
  });
});

describe('S5.3 home — where the money has got to', () => {
  it('answers the question auditors ask most', () => {
    render(<HomeScreen next={null} upcoming={[]} payments={[payment()]} />);
    expect(screen.getByText(/Cleared for payment/)).toBeInTheDocument();
    expect(screen.getByText('£115')).toBeInTheDocument();
  });

  it('states the payment stage in words, never a colour alone', () => {
    // Read outdoors, in daylight, by someone watching something they cannot
    // pause. Telling two chips apart is not a reasonable ask.
    render(
      <HomeScreen
        next={null}
        upcoming={[]}
        payments={[payment({ state: 'scheduled', stateLabel: 'In the next payout run' })]}
      />,
    );
    expect(screen.getByText(/In the next payout run/)).toBeInTheDocument();
  });

  it('shows the reference once the money has moved', () => {
    render(
      <HomeScreen
        next={null}
        upcoming={[]}
        payments={[payment({ state: 'paid', stateLabel: 'Paid', reference: 'BACS-0091' })]}
      />,
    );
    expect(screen.getByText(/BACS-0091/)).toBeInTheDocument();
  });

  it('says nothing about the client’s copy', () => {
    // Payment and client release resolve independently (TND-81). An audit
    // cleared for payment whose client copy is held must look exactly like one
    // with no hold at all — the auditor learns about their money and nothing
    // about the review.
    render(<HomeScreen next={null} upcoming={[]} payments={[payment()]} />);
    const body = document.body.textContent ?? '';
    for (const leak of ['client', 'release', 'held', 'gate', 'review gate']) {
      expect(body.toLowerCase()).not.toContain(leak);
    }
  });
});
