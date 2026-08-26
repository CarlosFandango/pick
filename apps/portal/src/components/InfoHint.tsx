import { color, radius } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { hairline, sans } from '@/lib/theme';

/**
 * A label, with "why are you asking me this?" answered on demand.
 *
 * Built on `<details>` rather than a hover tooltip. Hover puts the explanation
 * out of reach on a touch screen, which is where a fundraising manager is most
 * likely to be booking; `title` attributes are invisible to most screen
 * readers; and a floating panel has to be positioned, which is where these
 * break. `<details>` is keyboard-operable, announced as a disclosure, needs no
 * JavaScript, and pushes the page down instead of covering it.
 *
 * The whole label is the trigger, not just the icon — a 15px target is a hard
 * thing to hit and an easy thing to miss.
 */
export function InfoHint({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <details>
      <summary
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          cursor: 'pointer',
          listStyle: 'none',
        }}
      >
        {label}
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 15,
            height: 15,
            flex: 'none',
            borderRadius: radius.pill,
            border: `1px solid ${color.muted}`,
            color: color.muted,
            fontFamily: sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          i
        </span>
      </summary>
      <div
        style={{
          marginTop: 8,
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: '10px 13px',
          fontSize: 12.5,
          lineHeight: 1.55,
          fontWeight: 400,
          letterSpacing: 0,
          textTransform: 'none',
          color: color.bodyBrown,
          maxWidth: 460,
        }}
      >
        {children}
      </div>
    </details>
  );
}
