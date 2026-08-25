/**
 * The shared design system.
 *
 * Tokens are the layer both apps share; components are not. `apps/portal`
 * renders HTML and `apps/field` renders React Native primitives, so a single
 * component library cannot serve both without an abstraction that would cost
 * more than it saves. Sharing the *vocabulary* — spacing, colour roles, type
 * scale, touch targets — is what actually delivers a consistent experience and
 * makes a rebrand one object rather than a sweep through two codebases.
 *
 * This package has no dependencies and imports nothing platform-specific.
 * Keep it that way: the moment it imports React or CSS, one app loses it.
 */

export * from './css.js';
export * from './primitives.js';
export * from './theme.js';
