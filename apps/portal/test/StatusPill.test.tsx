import { AUDITOR_STATUS, CLIENT_STATUS } from '@picksel/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from '@/components/StatusPill';

describe('a status pill', () => {
  it('always carries its label, never colour alone', () => {
    // The brand's pass-teal and fail-red sit at almost the same luminance, so
    // a status told only in colour is a status a lot of readers cannot read.
    // Pinned in packages/tokens/test/theme.test.ts; enforced here.
    for (const chip of Object.values(CLIENT_STATUS)) {
      const { unmount } = render(<StatusPill chip={chip} />);
      expect(screen.getByText(chip.label)).toBeVisible();
      unmount();
    }
  });

  it('never paints a status in the fail colour', () => {
    // An audit can be cancelled or find nobody there. Neither is a failure by
    // anyone, and colouring it like one accuses the auditor who travelled.
    const fail = 'rgb(164, 56, 44)'; // creativeText

    for (const chip of [...Object.values(CLIENT_STATUS), ...Object.values(AUDITOR_STATUS)]) {
      const { container, unmount } = render(<StatusPill chip={chip} />);
      const pill = container.firstElementChild as HTMLElement;
      expect(pill.style.color, chip.label).not.toBe(fail);
      expect(pill.style.background, chip.label).not.toBe(fail);
      unmount();
    }
  });

  it('gives a no-show its own neutral tone rather than a warning', () => {
    render(<StatusPill chip={CLIENT_STATUS.no_team_present} />);
    expect(screen.getByText('NO TEAM PRESENT')).toBeVisible();
    expect(CLIENT_STATUS.no_team_present.tone).toBe('info');
  });

  it('separates the client language from the auditor language', () => {
    // Same underlying state, two audiences: the client is told the audit is
    // assigned, the auditor is told a write-up is due.
    expect(CLIENT_STATUS.assigned.label).toBe('ASSIGNED');
    expect(AUDITOR_STATUS.assigned.label).toBe('WRITE-UP DUE');
  });
});
