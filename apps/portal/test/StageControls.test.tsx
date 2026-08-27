import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageControls, type StagePermissionState } from '@/app/admin/stages/StageControls';

const interaction: StagePermissionState = {
  key: 'interaction',
  isActive: true,
  allowsTallies: false,
  allowsNotes: false,
  allowsMarkers: true,
};

describe('the audit stage controls', () => {
  it('says whether each thing is allowed in words, not just colour', () => {
    // No token test can enforce this, and the screen is entirely on/off pairs
    // — the one shape where colour alone carries everything if nobody stops
    // it. `success`/`danger` are separated in luminance for the same reason.
    // Asserted on the visible text rather than the accessible name: the
    // aria-label spells out the whole row, so a role query would pass even if
    // the button itself rendered nothing but a coloured dot.
    render(<StageControls stage={interaction} />);

    expect(screen.getAllByText('Not allowed')).toHaveLength(2);
    expect(screen.getAllByText('Allowed')).toHaveLength(1);
  });

  it('names the stage and the permission in each button label', () => {
    // Three buttons reading "Not allowed" are indistinguishable to anyone not
    // looking at the row they sit in.
    render(<StageControls stage={interaction} />);

    expect(
      screen.getByLabelText('Tallies during interaction: currently not allowed'),
    ).toBeVisible();
    expect(screen.getByLabelText('Markers during interaction: currently allowed')).toBeVisible();
  });

  it('changes one permission at a time', () => {
    // Each control is its own form. A failed change must not take the other
    // two with it, and nothing on this screen should need saving.
    const { container } = render(<StageControls stage={interaction} />);

    // Three permissions plus the in-use toggle.
    expect(container.querySelectorAll('form')).toHaveLength(4);
  });

  it('offers to retire a stage rather than delete it', () => {
    // Completed audits pin the stage list they ran under. A stage that
    // disappeared would leave their timings pointing at nothing.
    render(<StageControls stage={interaction} />);

    expect(screen.getByRole('button', { name: 'In use' })).toBeVisible();
  });
});
