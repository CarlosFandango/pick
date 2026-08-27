import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PipelineRail } from '@/components/PipelineRail';

/**
 * S3.3 — the rail a client watches an audit move along.
 *
 * It shipped unreadable: upcoming steps at 1.16:1 against the page and the
 * current marker at 1.75:1. These pin what the rail must communicate, not how
 * it is painted, so the layout can move without breaking them.
 */
describe('the pipeline rail', () => {
  it('shows the whole journey, not just where the audit is now', () => {
    render(<PipelineRail status="in_progress" />);

    const rail = screen.getByRole('list', { name: 'Audit progress' });
    const steps = within(rail).getAllByRole('listitem');
    expect(steps.length).toBeGreaterThan(2);
  });

  it('marks exactly one step as the current one', () => {
    render(<PipelineRail status="in_review" />);

    const current = screen
      .getAllByRole('listitem')
      .filter((step) => step.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('IN REVIEW');
  });

  it('says done or not started out loud, so state is not colour alone', () => {
    // A sighted reader gets this from a filled or hollow dot. Without the
    // hidden text an assistive reader gets an ordered list and nothing else.
    render(<PipelineRail status="in_review" />);

    const rail = screen.getByRole('list', { name: 'Audit progress' });
    expect(rail).toHaveTextContent(/done/);
    expect(rail).toHaveTextContent(/not started/);
    expect(rail).toHaveTextContent(/current step/);
  });

  it('never paints a step in a colour that is a fill rather than a text pair', () => {
    // The actual regression. `oat` is a hairline (1.16:1) and `auditing` is
    // signage (1.75:1); both were used as label colours.
    const { container } = render(<PipelineRail status="in_progress" />);

    const painted = [...container.querySelectorAll<HTMLElement>('span')].map(
      (node) => node.style.color,
    );
    expect(painted).not.toContain('rgb(229, 223, 208)'); // oat
    expect(painted).not.toContain('rgb(242, 169, 0)'); // auditing
  });

  it('takes an audit that left the rail off the rail entirely', () => {
    // Showing "no team present" half way along a track it is no longer on
    // would be a lie about where the audit is.
    render(<PipelineRail status="no_team_present" />);

    expect(screen.queryByRole('list', { name: 'Audit progress' })).toBeNull();
    expect(screen.getByText(/credit has been returned/)).toBeVisible();
  });

  it('does not call a no-show a failure, because it is no one’s', () => {
    render(<PipelineRail status="no_team_present" />);

    expect(screen.getByText(/not a failed audit/)).toBeVisible();
  });
});
