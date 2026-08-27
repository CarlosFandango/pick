import { type AuditStage, startStagedSession } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoShowScreen, WAIT_MINUTES, waitRemaining } from '../src/components/NoShowScreen';

const START = new Date(2026, 2, 3, 11, 0);
const STAGES: AuditStage[] = [
  {
    key: 'arrival',
    label: 'Arrival and setup',
    sequence: 1,
    captureMode: 'observation',
    permissions: { tallies: true, notes: true, markers: true },
    moment: null,
    durationHintMinutes: null,
  },
];

const session = startStagedSession(STAGES, START);
const noop = () => undefined;

const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

const view = (now: Date, over: Record<string, unknown> = {}) => (
  <NoShowScreen
    session={session}
    now={now}
    areaLabel="SE15 · Street"
    onReport={noop}
    onKeepWaiting={noop}
    {...over}
  />
);

describe('waitRemaining', () => {
  it('counts down the wait', () => {
    expect(waitRemaining(session, at(0))).toBe(WAIT_MINUTES);
    expect(waitRemaining(session, at(30))).toBe(15);
    expect(waitRemaining(session, at(45))).toBe(0);
    expect(waitRemaining(session, at(90))).toBe(0);
  });
});

describe('S2.7 no team present', () => {
  it('shows how long they have waited', () => {
    render(view(at(30)));
    expect(screen.getByLabelText('Waited 00:30:00')).toBeInTheDocument();
    expect(screen.getByText('15 MIN UNTIL YOU CAN REPORT')).toBeInTheDocument();
  });

  it('will not let them report too early', async () => {
    const onReport = vi.fn();
    render(view(at(20), { onReport }));

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('button', { name: 'Report no team present' }));
    expect(onReport).not.toHaveBeenCalled();
  });

  it('lets them report once the wait is served', async () => {
    const onReport = vi.fn();
    render(view(at(45), { onReport }));

    expect(screen.getByText('45 MINUTES REACHED')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Report no team present' }));
    expect(onReport).toHaveBeenCalledOnce();
  });

  it('lets them carry on if the team turns up late', async () => {
    const onKeepWaiting = vi.fn();
    render(view(at(50), { onKeepWaiting }));

    await userEvent.click(screen.getByRole('button', { name: 'They have arrived' }));
    expect(onKeepWaiting).toHaveBeenCalledOnce();
  });

  it('confirms without making it feel like a failure', () => {
    render(view(at(50), { submitted: true }));

    // The auditor did their job by travelling and waiting.
    expect(screen.getByText('Logged. Thank you.')).toBeInTheDocument();
    expect(screen.getByText(/paid in full/)).toBeInTheDocument();
    expect(screen.getByText(/does not count against your record/)).toBeInTheDocument();
    expect(screen.queryByText(/fail|sorry|problem|unfortunately/i)).toBeNull();
  });
});
