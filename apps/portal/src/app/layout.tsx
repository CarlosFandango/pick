import { pickselDark, pickselLight, themeToCssText } from '@picksel/tokens';
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
          background: 'var(--colour-background)',
          color: 'var(--colour-text)',
          margin: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
