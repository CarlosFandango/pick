import { pickselDark, pickselLight, themeToCssText, webTextStyle } from '@picksel/tokens';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { mono, sans } from '@/lib/theme';

/**
 * The brand faces.
 *
 * `design/tokens/tokens.ts` names Archivo and IBM Plex Mono, and BUILD-GUIDE
 * says the drop wins where it disagrees with something invented here. The
 * portal used to name both in CSS and load neither, so both silently fell back
 * — a font stack naming a face nobody serves is worse than one that does not,
 * because it reads as decided.
 *
 * Files are committed under ./fonts rather than fetched by `next/font/google`,
 * which downloads at build time: that makes every build depend on Google Fonts
 * being reachable, and a build that fails because a CDN is down is a bad
 * failure. 80 KB, latin only, OFL — see ./fonts/README.md.
 *
 * The family names next/font generates are hashed, so both are bound to CSS
 * variables and `lib/theme.ts` composes them with the shared fallback stack.
 */
const archivo = localFont({
  src: './fonts/archivo-latin.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-sans',
});

const plexMono = localFont({
  src: [
    { path: './fonts/plex-mono-400-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plex-mono-500-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/plex-mono-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-mono',
});

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
  // The field app has no webfont loader yet, so it renders the system stack.
  // Named here rather than assumed, so the divergence is visible in one place.
  `code, kbd, samp, pre { font-family: ${mono}; }`,
].join('\n');

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${plexMono.variable}`}>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated from typed tokens, no user input */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body
        style={{
          ...webTextStyle('body'),
          fontFamily: sans,
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
