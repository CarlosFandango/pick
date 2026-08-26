import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GateControls } from '@/app/admin/gates/GateControls';

describe('the review gate controls', () => {
  const props = {
    trigger: 'client_first_audit',
    enabled: true,
    mode: 'hold',
    scope: 'client_release',
  };

  it('offers both things a gate can hold, separately', () => {
    // Payment and client release must resolve independently. A quality hold
    // becoming a pay delay is the conflict TND-79 exists to prevent.
    render(<GateControls {...props} />);

    expect(screen.getByRole('button', { name: 'payment' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'client release' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'both' })).toBeVisible();
  });

  it('shows which mode and scope are current, without colour alone', () => {
    render(<GateControls {...props} />);

    expect(screen.getByRole('button', { name: 'hold' })).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByRole('button', { name: 'notify' })).toHaveStyle({ fontWeight: '500' });
  });

  it('offers no way to invent a trigger', () => {
    // Adding one is a code change reviewed like any other. A rule-authoring
    // engine would be more complex than the tiers it replaced, and would be
    // configured once then never understood.
    const { container } = render(<GateControls {...props} />);

    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /add|new/i })).toBeNull();
  });

  it('says whether the gate is on', () => {
    render(<GateControls {...props} enabled={false} />);
    expect(screen.getByRole('button', { name: 'Off' })).toBeVisible();
  });
});
