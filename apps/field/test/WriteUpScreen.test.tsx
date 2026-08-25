import { type Answer, buildWriteUp, type WriteUpCheck } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WriteUpScreen } from '../src/components/WriteUpScreen';

const checks: WriteUpCheck[] = [
  { id: 'a1', moment: 'approach', prompt: 'Badge visible', sortOrder: 10 },
  { id: 'p1', moment: 'pitch', prompt: 'Claims match approved script', sortOrder: 10 },
  { id: 'p2', moment: 'pitch', prompt: 'No exaggerated outcomes', sortOrder: 20 },
];

const noop = () => undefined;

type ScreenProps = Parameters<typeof WriteUpScreen>[0];

/** A write-up screen with sensible defaults, so each test states only its point. */
function view(over: Partial<ScreenProps> = {}, answers: [string, Answer][] = []) {
  const writeUp = over.writeUp ?? buildWriteUp({ checks, answers: new Map(answers) });

  return (
    <WriteUpScreen
      title="Write-up · SE15 street"
      savedAt={new Date(2026, 2, 3, 14, 32)}
      openMoment="pitch"
      onOpenMoment={noop}
      onAnswer={noop}
      onNote={noop}
      onSubmit={noop}
      {...over}
      writeUp={writeUp}
    />
  );
}

describe('S1.6 write-up', () => {
  it('labels the draft state and when it last saved', () => {
    render(view());
    // Offline-first: local draft → syncing → submitted, always labelled.
    expect(screen.getByText('LOCAL DRAFT')).toBeInTheDocument();
    expect(screen.getByText('AUTOSAVED 14:32')).toBeInTheDocument();
  });

  it('replays the shift in the same order as the field session', () => {
    render(view());
    expect(screen.getByText('Approach')).toBeInTheDocument();
    expect(screen.getByText('Pitch')).toBeInTheDocument();
  });

  it('offers PASS, FAIL and NOTE — never OBS', () => {
    render(view());
    expect(screen.getAllByRole('button', { name: 'PASS' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'FAIL' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'NOTE' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('OBS')).toBeNull();
  });

  it('records a verdict', async () => {
    const onAnswer = vi.fn();
    render(view({ onAnswer }));

    await userEvent.click(screen.getAllByRole('button', { name: 'FAIL' })[0] as HTMLElement);
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 'fail');
  });

  it('lets a note be attached to any check', async () => {
    const onNote = vi.fn();
    render(view({ onNote }));

    await userEvent.type(screen.getByLabelText('Note for No exaggerated outcomes'), 'Said double');
    expect(onNote).toHaveBeenCalled();
  });

  it('summarises a finished moment and offers to edit it', () => {
    render(view({ openMoment: 'pitch' }, [['a1', { verdict: 'pass' }]]));

    expect(screen.getByText('1 PASS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Approach' })).toBeInTheDocument();
  });

  it('leads a mixed moment with the failure', () => {
    render(
      view({ openMoment: null }, [
        ['p1', { verdict: 'pass' }],
        ['p2', { verdict: 'fail' }],
      ]),
    );
    expect(screen.getByText('1 FAIL · 1 PASS')).toBeInTheDocument();
  });

  it('will not submit until every moment is done', async () => {
    const onSubmit = vi.fn();
    render(view({ onSubmit }, [['a1', { verdict: 'pass' }]]));

    const submit = screen.getByRole('button', { name: /Submit/ });
    expect(submit).toHaveTextContent('Submit — 1 moment left');

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once the write-up is complete', async () => {
    const onSubmit = vi.fn();
    render(
      view({ onSubmit }, [
        ['a1', { verdict: 'pass' }],
        ['p1', { verdict: 'pass' }],
        ['p2', { verdict: 'fail' }],
      ]),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows the markers the auditor left at the time', () => {
    const writeUp = buildWriteUp({
      checks,
      answers: new Map(),
      markers: new Map([['pitch', [new Date(2026, 2, 3, 11, 52)]]]),
    });
    render(
      <WriteUpScreen
        writeUp={writeUp}
        title="Write-up"
        openMoment="pitch"
        onOpenMoment={noop}
        onAnswer={noop}
        onNote={noop}
        onSubmit={noop}
      />,
    );
    expect(screen.getByText('MARKER 11:52')).toBeInTheDocument();
  });

  it('reopens only the moments PICK returned', () => {
    const writeUp = buildWriteUp({
      checks,
      answers: new Map(),
      state: 'returned',
      unlockedMoments: new Set(['pitch']),
    });
    render(
      <WriteUpScreen
        writeUp={writeUp}
        title="Write-up"
        openMoment="pitch"
        onOpenMoment={noop}
        onAnswer={noop}
        onNote={noop}
        onSubmit={noop}
      />,
    );

    expect(screen.getByText('RETURNED FOR REWORK')).toBeInTheDocument();
    // Approach was not flagged, so it cannot be edited or reopened.
    expect(screen.queryByRole('button', { name: 'Edit Approach' })).toBeNull();
    expect(screen.getByLabelText('Verdict for Claims match approved script')).toBeInTheDocument();
  });
});
