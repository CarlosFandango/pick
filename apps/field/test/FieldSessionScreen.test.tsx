import { type AuditStage, addTally, advanceStage, startStagedSession } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FieldSessionScreen, FlagSheet } from '../src/components/FieldSessionScreen';

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
  {
    key: 'team_observation',
    label: 'Team observation',
    sequence: 2,
    captureMode: 'observation',
    permissions: { tallies: true, notes: true, markers: true },
    moment: 'approach',
    durationHintMinutes: 45,
  },
  {
    key: 'pitch',
    label: 'Pitch',
    sequence: 3,
    captureMode: 'interaction',
    permissions: { tallies: false, notes: false, markers: true },
    moment: 'pitch',
    durationHintMinutes: null,
  },
  {
    key: 'close',
    label: 'Close and exit',
    sequence: 4,
    captureMode: 'interaction',
    permissions: { tallies: false, notes: false, markers: true },
    moment: 'close',
    durationHintMinutes: null,
  },
];

const START = new Date(2026, 2, 3, 11, 38);
const NOW = new Date(2026, 2, 3, 12, 20, 17);
const noop = () => undefined;

const props = {
  stages: STAGES,
  now: NOW,
  areaLabel: 'SE15 · Street',
  onAdvance: noop,
  onTally: noop,
  onFlag: noop,
  onEnd: noop,
};

/** A session sitting on the nth stage. */
const onStage = (index: number) => {
  let session = startStagedSession(STAGES, START);
  for (let i = 0; i < index; i++) {
    session = advanceStage(STAGES, session, new Date(START.getTime() + (i + 1) * 60_000));
  }
  return session;
};

describe('S1.5b field session', () => {
  it('shows the whole shift as a sequence with where they are', () => {
    render(<FieldSessionScreen {...props} session={onStage(1)} />);

    expect(screen.getByText('Arrival and setup')).toBeInTheDocument();
    expect(screen.getByText('Close and exit')).toBeInTheDocument();
    expect(screen.getByLabelText('Team observation current')).toBeInTheDocument();
  });

  it('runs a clock the auditor can read at arm’s length', () => {
    render(<FieldSessionScreen {...props} session={onStage(0)} />);
    expect(screen.getByLabelText(/Session running 00:42:17/)).toBeInTheDocument();
  });

  it('advances rather than ending, until the last stage', async () => {
    const onAdvance = vi.fn();
    const user = userEvent.setup();
    render(<FieldSessionScreen {...props} onAdvance={onAdvance} session={onStage(0)} />);

    await user.click(screen.getByRole('button', { name: 'NEXT STAGE' }));
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it('offers to end only once there is nothing left to advance to', async () => {
    const onEnd = vi.fn();
    const user = userEvent.setup();
    render(<FieldSessionScreen {...props} onEnd={onEnd} session={onStage(3)} />);

    expect(screen.queryByRole('button', { name: 'NEXT STAGE' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'END SESSION' }));
    expect(onEnd).toHaveBeenCalledOnce();
  });
});

describe('what the screen offers per capture mode', () => {
  it('gives an observer counters, because they can be seen holding a phone', async () => {
    const onTally = vi.fn();
    const user = userEvent.setup();
    render(<FieldSessionScreen {...props} onTally={onTally} session={onStage(1)} />);

    await user.click(screen.getByRole('button', { name: /Stops, 0 so far/ }));
    expect(onTally).toHaveBeenCalledWith('stops');
  });

  it('offers NOTHING to fill in during an interaction', () => {
    // The rule from TND-83, and the reason this screen was rebuilt: an auditor
    // being pitched to cannot tap counters. Asserted as the absence of the
    // controls, not of a label — a redesign may move the words.
    render(<FieldSessionScreen {...props} session={onStage(2)} />);

    expect(screen.queryByLabelText('Counters')).toBeNull();
    expect(screen.queryByRole('button', { name: /so far/ })).toBeNull();
  });

  it('says so, rather than looking broken', () => {
    render(<FieldSessionScreen {...props} session={onStage(2)} />);
    expect(screen.getByText(/WRITE IT UP AFTERWARDS/)).toBeInTheDocument();
  });

  it('keeps the flag reachable in every stage', async () => {
    // One tap, no reading. It is the only live control during a mystery shop,
    // and something going wrong mid-pitch is when it is most needed.
    const onFlag = vi.fn();
    const user = userEvent.setup();

    for (const index of [1, 2]) {
      const { unmount } = render(
        <FieldSessionScreen {...props} onFlag={onFlag} session={onStage(index)} />,
      );
      await user.click(screen.getByRole('button', { name: 'Flag' }));
      unmount();
    }

    expect(onFlag).toHaveBeenCalledTimes(2);
  });

  it('shows a running count as the auditor taps', () => {
    let session = onStage(1);
    for (const minute of [3, 6]) {
      session = addTally(STAGES, session, {
        stageKey: 'team_observation',
        counterKey: 'stops',
        occurredAt: new Date(START.getTime() + minute * 60_000),
      });
    }

    render(<FieldSessionScreen {...props} session={session} />);
    expect(screen.getByRole('button', { name: /Stops, 2 so far/ })).toBeInTheDocument();
  });
});

describe('S2.3 flag sheet', () => {
  it('offers three severities and no text field', () => {
    render(<FlagSheet onChoose={noop} onCancel={noop} />);

    for (const label of ['Wrong', 'Note', 'Fine']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    // Typing on a street means looking down, and an auditor looking down is an
    // auditor not watching.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('hands back the severity that was chosen', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<FlagSheet onChoose={onChoose} onCancel={noop} />);

    await user.click(screen.getByRole('button', { name: /Wrong/ }));
    expect(onChoose).toHaveBeenCalledWith('wrong');
  });

  it('can be dismissed without recording anything', async () => {
    const onCancel = vi.fn();
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<FlagSheet onChoose={onChoose} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
