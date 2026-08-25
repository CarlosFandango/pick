/**
 * The design drop, re-exported unchanged.
 *
 * `design/tokens/tokens.ts` is the only styling source in the product. This
 * module exists so the rest of the codebase imports one package rather than
 * reaching across the repo, and so a value can never be copied and drift.
 *
 * Nothing here transforms anything. Semantic roles live in `theme.ts`, which
 * maps these values onto `background`, `danger`, and so on.
 */
export { color, font, radius, semantics } from '@picksel/design-tokens';
