import { advance, flag, startSession } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FieldSessionScreen, FlagSheet } from '../src/components/FieldSessionScreen';

const START = new Date(2026, 2, 3, 11, 38);
const NOW = new Date(2026, 2, 3, 12, 20, 17);
const noop = () => undefined;

const props = {
  now: NOW,
  areaLabel: 'SE15 · Street',
  onAdvance: noop,
  onFlag: noop,
  onEnd: noop,
};

describe('S1.5b field session', () => {
  it('shows the whole shift as a sequence with where they are', () => {
    const session = advance(startSession(START), new Date(2026, 2, 3, 11, 44));
    render(<FieldSessionScreen {...props} session={session} />);

    expect(screen.getByText('Approach')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByLabelText('Walk-up current')).toBeInTheDocument();
    expect(screen.getByLabelText('Approach done')).toBeInTheDocument();
    expect(screen.getByLabelText('Pitch upcoming')).toBeInTheDocument();
  });

  it('marks the current moment NOW and stamps the finished ones', () => {
    const session = advance(startSession(START), new Date(2026, 2, 3, 11, 44));
    render(<FieldSessionScreen {...props} session={session} />);

    expect(screen.getByText('NOW')).toBeInTheDocument();
    expect(screen.getByText('11:38')).toBeInTheDocument();
  });

  it('runs a session clock', () => {
    render(<FieldSessionScreen {...props} session={startSession(START)} />);
    expect(screen.getByLabelText('Session running 00:42:17')).toBeInTheDocument();
  });

  it('advances on one tap', async () => {
    const onAdvance = vi.fn();
    render(<FieldSessionScreen {...props} session={startSession(START)} onAdvance={onAdvance} />);

    await userEvent.click(screen.getByRole('button', { name: 'NEXT MOMENT' }));
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it('offers to end the session once the last moment is reached', async () => {
    const onEnd = vi.fn();
    let session = startSession(START);
    for (let i = 0; i < 8; i += 1) session = advance(session, START);

    render(<FieldSessionScreen {...props} session={session} onEnd={onEnd} />);

    expect(screen.queryByRole('button', { name: 'NEXT MOMENT' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'END SESSION' }));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('has a flag button reachable with the same thumb', async () => {
    const onFlag = vi.fn();
    render(<FieldSessionScreen {...props} session={startSession(START)} onFlag={onFlag} />);

    await userEvent.click(screen.getByRole('button', { name: 'Flag' }));
    expect(onFlag).toHaveBeenCalledOnce();
  });

  it('asks the auditor to read nothing but the moment they are in', () => {
    const session = flag(startSession(START), {
      id: 'f',
      moment: 'approach',
      severity: 'wrong',
      occurredAt: START,
    });
    render(<FieldSessionScreen {...props} session={session} />);

    // No check prompts, no categories, no verdicts. Every judgement waits for
    // write-up; on the street the auditor is watching, not reading.
    expect(screen.queryByText(/pass|fail|compliance|category|vulnerab/i)).toBeNull();
  });
});

describe('S2.3 flag sheet', () => {
  it('offers exactly three severities and no text field', () => {
    render(<FlagSheet onChoose={noop} onCancel={noop} />);

    expect(screen.getByRole('button', { name: /Wrong/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Note/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fine/ })).toBeInTheDocument();
    // Typing on a street means looking down, and an auditor looking down is
    // an auditor not watching.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('records a flag as good as well as bad', async () => {
    const onChoose = vi.fn();
    render(<FlagSheet onChoose={onChoose} onCancel={noop} />);

    await userEvent.click(screen.getByRole('button', { name: /Fine/ }));
    // An audit that can only record failure is not an observation tool.
    expect(onChoose).toHaveBeenCalledWith('fine');
  });

  it('passes the chosen severity through', async () => {
    const onChoose = vi.fn();
    render(<FlagSheet onChoose={onChoose} onCancel={noop} />);

    await userEvent.click(screen.getByRole('button', { name: /Wrong/ }));
    expect(onChoose).toHaveBeenCalledWith('wrong');
  });

  it('can be dismissed without recording anything', async () => {
    const onChoose = vi.fn();
    const onCancel = vi.fn();
    render(<FlagSheet onChoose={onChoose} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
