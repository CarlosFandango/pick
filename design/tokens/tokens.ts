// PICK design tokens — single source for web (Next.js) and app (React Native)
// Derived from the PICK Brand Exploration design system. Do not invent values.
export const color = {
  teal: '#0B5D5C',
  navy: '#062134',
  ink: '#1C1A15',
  bone: '#F4EFE6',
  oat: '#E5DFD0',
  paper: '#FBF8F1',
  white: '#FFFFFF',
  blue: '#3F86E8',
  bodyBrown: '#4D483D',
  muted: '#625C4C',
  tealInk: '#04201F',
  link: '#0B6A68',
  // division accents (fills) + deep text pairs + on-fill inks
  auditing: '#F2A900',
  auditingText: '#8A6100',
  auditingInk: '#4A3400',
  recruitment: '#062134',
  consulting: '#0E9B99',
  creative: '#EC6A5E',
  technology: '#8E4FA8',
  creativeText: '#A4382C', // used as fail-red in PICKsel
  onDark: '#F4EFE6',
  onDarkMuted: '#C6D4E2',
  // PICKsel field-mode (dark) surfaces from mockups
  fieldBg: '#041825',
  fieldSheet: '#0A2438',
  fieldMuted: '#7E93A6',
  fieldDim: '#4E6377',
} as const;
export const font = {
  sans: 'Archivo',
  mono: 'IBM Plex Mono',
  displayWeight: '800',
  headingWeight: '700',
  monoWeight: '500',
  displayTracking: -0.03,
  headingTracking: -0.02,
  metaTracking: 0.14, // em
} as const;
export const radius = { pill: 100, tile: 5 } as const; // nothing between
export const semantics = {
  pass: color.teal,
  fail: color.creativeText,
  note: color.auditingText,
  // status chips: BOOKED/ASSIGNED oat-outline, IN PROGRESS auditing amber,
  // IN REVIEW amber, RELEASED/APPROVED/PAID teal, NO TEAM PRESENT navy (neutral, never red)
} as const;
