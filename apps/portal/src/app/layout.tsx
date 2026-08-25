import {
  fontStack,
  pickselDark,
  pickselLight,
  themeToCssText,
  webTextStyle,
} from '@picksel/tokens';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'PICKsel',
  description: 'Fundraising compliance audits',
};

/**
 * Themes are emitted from the shared tokens rather than kept in a stylesheet,
 * so a rebrand cannot leave the CSS behind.
 */
const themeCss = [
  themeToCssText(pickselLight, ':root'),
  `@media (prefers-color-scheme: dark) { ${themeToCssText(pickselDark, ':root')} }`,
  // A minimal reset. Browser defaults for h1..h6 and p carry their own sizes,
  // weights and margins, which would silently override the shared type scale
  // and put the portal out of step with the field app.
  `*, *::before, *::after { box-sizing: border-box; }`,
  `h1, h2, h3, h4, h5, h6, p, figure { margin: 0; font-size: inherit; font-weight: inherit; }`,
  `body { font-family: ${fontStack.sans.web}; -webkit-font-smoothing: antialiased; }`,
].join('\n');

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated from typed tokens, no user input */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body
        style={{
          ...webTextStyle('body'),
          background: 'var(--colour-background)',
          color: 'var(--colour-text)',
          margin: 0,
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
