import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoHint } from '@/components/InfoHint';

/**
 * "Why are you asking me this?", answered on demand.
 *
 * The rules that matter are reachability rules. A hover tooltip would satisfy
 * a screenshot and fail every one of these.
 */
describe('an info hint', () => {
  it('stays closed until it is asked for', () => {
    render(<InfoHint label={<span>Date window</span>}>Because teams behave differently.</InfoHint>);

    expect(screen.getByRole('group')).not.toHaveAttribute('open');
  });

  it('opens on a click anywhere on the label, not just the tiny icon', async () => {
    const user = userEvent.setup();
    render(<InfoHint label={<span>Date window</span>}>Because teams behave differently.</InfoHint>);

    await user.click(screen.getByText('Date window'));

    expect(screen.getByRole('group')).toHaveAttribute('open');
    expect(screen.getByText(/behave differently/)).toBeVisible();
  });

  it('is reachable by keyboard at all', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <InfoHint label={<span>Date window</span>}>Because teams behave differently.</InfoHint>,
    );

    await user.tab();

    // That Enter then *opens* it is the browser's own behaviour, which jsdom
    // does not implement — booking-clarity.spec.ts asserts it in Chromium.
    // What this layer can prove is that the trigger is in the tab order, which
    // a div-with-onClick tooltip would not be.
    expect(document.activeElement).toBe(container.querySelector('summary'));
  });

  it('keeps the explanation in the document rather than in a title attribute', () => {
    // `title` is invisible to most screen readers and unreachable on touch.
    const { container } = render(
      <InfoHint label={<span>Date window</span>}>Because teams behave differently.</InfoHint>,
    );

    expect(container.querySelector('[title]')).toBeNull();
    expect(screen.getByText(/behave differently/)).toBeInTheDocument();
  });
});
