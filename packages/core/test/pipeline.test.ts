import { describe, expect, it } from 'vitest';
import { branchExplanation, hasReport, pipelineSteps } from '../src/pipeline';

describe('pipelineSteps', () => {
  it('shows where an audit has got to', () => {
    const steps = pipelineSteps('in_progress');
    expect(steps?.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('starts at booked and ends at released', () => {
    const steps = pipelineSteps('booked');
    expect(steps?.at(0)).toMatchObject({ label: 'BOOKED', state: 'current' });
    expect(steps?.at(-1)).toMatchObject({ label: 'RELEASED', state: 'upcoming' });
  });

  it('marks everything done once released', () => {
    const steps = pipelineSteps('released');
    expect(steps?.filter((s) => s.state === 'upcoming')).toHaveLength(0);
    expect(steps?.at(-1)?.state).toBe('current');
  });

  it('gives no rail to an audit that left the line', () => {
    // Showing it half-way along a track it is no longer on would be a lie
    // about where it is.
    expect(pipelineSteps('no_team_present')).toBeNull();
    expect(pipelineSteps('cancelled')).toBeNull();
  });
});

describe('branchExplanation', () => {
  it('says plainly that no team present is not a failure', () => {
    const text = branchExplanation('no_team_present');
    expect(text).toMatch(/not a failed audit/i);
    expect(text).toMatch(/credit has been returned/i);
    expect(text).toMatch(/paid in full/i);
  });

  it('explains a cancellation and the refund', () => {
    expect(branchExplanation('cancelled')).toMatch(/credit has been returned/i);
  });

  it('says nothing about an audit still on the rail', () => {
    expect(branchExplanation('in_review')).toBeNull();
  });
});

describe('hasReport', () => {
  it('is true only once PICK has released it', () => {
    expect(hasReport('released')).toBe(true);
    for (const status of ['booked', 'assigned', 'in_progress', 'in_review'] as const) {
      expect(hasReport(status), status).toBe(false);
    }
  });

  it('is false for an audit that never happened', () => {
    expect(hasReport('no_team_present')).toBe(false);
  });
});
