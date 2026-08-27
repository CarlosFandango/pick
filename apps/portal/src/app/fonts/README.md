# Brand faces, self-hosted

`design/tokens/tokens.ts` names Archivo and IBM Plex Mono. These are the latin
subsets of both, served by `next/font/local` from `app/layout.tsx`.

Self-hosted rather than fetched by `next/font/google` at build time, because
that makes every build depend on Google Fonts being reachable — a build that
fails when a CDN is unavailable is a bad failure, and it is not reproducible
from a checkout. 80 KB, committed once.

| File | Family | Weights |
|---|---|---|
| `archivo-latin.woff2` | Archivo | variable, 400–800 |
| `plex-mono-{400,500,600}-latin.woff2` | IBM Plex Mono | 400, 500, 600 |

Latin only: the product is UK English, and the other subsets Google serves
(cyrillic, greek, vietnamese) would triple the weight for nothing.

Both families are licensed under the SIL Open Font License 1.1, which permits
redistribution with the licence alongside — `Archivo-OFL.txt` and
`IBMPlexMono-OFL.txt`.

To update: pull the same subset URLs from the Google Fonts CSS API, which is
where these came from. The field app has no webfont loader, so it still renders
the system stack — see `packages/tokens/src/typography.ts`.
