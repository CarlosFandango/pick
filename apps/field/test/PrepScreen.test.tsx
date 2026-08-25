import { buildPrepPlan, type PrepCard } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PrepScreen } from '../src/components/PrepScreen';

const cards: PrepCard[] = [
  { id: 'a1', moment: 'approach', prompt: 'Badge visible before speaking', sortOrder: 10 },
  { id: 'a2', moment: 'approach', prompt: 'Pavement kept clear', sortOrder: 20 },
  { id: 'p1', moment: 'pitch', prompt: 'Claims match the approved script', sortOrder: 10 },
];

const plan = (learnt: string[] = []) => buildPrepPlan(cards, new Set(learnt));
const noop = () => undefined;

describe('S1.4 prep', () => {
  it('shows the shift as a numbered sequence of moments', () => {
    render(
      <PrepScreen
        plan={plan()}
        kicker="Prep · street — direct debit"
        onGotIt={noop}
        onAgain={noop}
      />,
    );

    expect(screen.getByText('Approach')).toBeInTheDocument();
    expect(screen.getByText('Pitch')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('never shows a compliance category', () => {
    render(<PrepScreen plan={plan()} kicker="Prep" onGotIt={noop} onAgain={noop} />);

    // An auditor who knows a question is "the vulnerability one" answers it
    // differently. The category is absent from the device entirely.
    for (const category of ['vulnerability', 'safeguarding', 'data protection', 'solicitation']) {
      expect(screen.queryByText(new RegExp(category, 'i'))).toBeNull();
    }
  });

  it('shows overall progress', () => {
    render(<PrepScreen plan={plan(['a1'])} kicker="Prep" onGotIt={noop} onAgain={noop} />);
    expect(screen.getByLabelText('1 of 3 learnt')).toBeInTheDocument();
  });

  it('opens only the moment being worked on', () => {
    render(<PrepScreen plan={plan()} kicker="Prep" onGotIt={noop} onAgain={noop} />);

    // Approach is current, so its card is showing; pitch's is not.
    expect(screen.getByText('Badge visible before speaking')).toBeInTheDocument();
    expect(screen.queryByText('Claims match the approved script')).toBeNull();
  });

  it('moves to the next moment once one is finished', () => {
    render(<PrepScreen plan={plan(['a1', 'a2'])} kicker="Prep" onGotIt={noop} onAgain={noop} />);

    expect(screen.getByText('Claims match the approved script')).toBeInTheDocument();
    expect(screen.getByLabelText('Approach: 2 of 2')).toBeInTheDocument();
  });

  it('numbers the card within its moment', () => {
    render(<PrepScreen plan={plan(['a1'])} kicker="Prep" onGotIt={noop} onAgain={noop} />);
    expect(screen.getByText('CARD 2 OF 2')).toBeInTheDocument();
  });

  it('marks a card learnt', async () => {
    const onGotIt = vi.fn();
    render(<PrepScreen plan={plan()} kicker="Prep" onGotIt={onGotIt} onAgain={noop} />);

    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onGotIt).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('lets a card come round again', async () => {
    const onAgain = vi.fn();
    render(<PrepScreen plan={plan()} kicker="Prep" onGotIt={noop} onAgain={onAgain} />);

    await userEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(onAgain).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('shows no card at all once everything is learnt', () => {
    render(
      <PrepScreen plan={plan(['a1', 'a2', 'p1'])} kicker="Prep" onGotIt={noop} onAgain={noop} />,
    );

    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(screen.getByLabelText('3 of 3 learnt')).toBeInTheDocument();
  });
});
