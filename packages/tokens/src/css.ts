import { fontSize, radius, space } from './primitives';
import type { Theme } from './theme';

/** Web only: numeric token to a CSS length. React Native takes the raw number. */
export function px(value: number): string {
  return `${value}px`;
}

/**
 * Renders a theme as CSS custom properties for the portal.
 *
 * Emitted at runtime rather than kept as a hand-written stylesheet, so a theme
 * and its CSS cannot drift apart.
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [role, value] of Object.entries(theme.colors)) {
    vars[`--colour-${kebab(role)}`] = value;
  }
  for (const [name, value] of Object.entries(space)) {
    vars[`--space-${name}`] = px(value);
  }
  for (const [name, value] of Object.entries(radius)) {
    vars[`--radius-${name}`] = px(value);
  }
  for (const [name, value] of Object.entries(fontSize)) {
    vars[`--font-size-${name}`] = px(value);
  }

  return vars;
}

export function themeToCssText(theme: Theme, selector = ':root'): string {
  const body = Object.entries(themeToCssVariables(theme))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
