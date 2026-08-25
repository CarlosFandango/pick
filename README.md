# PICKsel

Fundraising compliance audits for UK charities.

Charities buy credits and book audits; approved contractor auditors are matched by
postcode and carry them out in the field. `apps/field` is offline-first because
the work happens on doorsteps and high streets, not at a desk.

## Layout

| Package | What |
|---|---|
| `apps/field` | Expo app. Auditors. SQLite offline-first. |
| `apps/portal` | Next.js. Client portal + PICK admin, role-gated. |
| `packages/core` | Domain logic: entities, validation, scoring. No I/O. |
| `packages/db` | Supabase schema, migrations, generated types. |
| `packages/api` | Supabase client factories + contract types. |
| `packages/ui` | Web components (portal only). |

## Getting started

```bash
pnpm install
cp .env.example .env

pnpm db:start     # local Supabase — needs Docker
pnpm db:types     # generate Database types from the local schema

pnpm dev
```

Then `pnpm typecheck && pnpm lint && pnpm test` — the same three CI runs.

## Environments

Supabase projects live in **London (eu-west-2)**: one for staging, one for
production. Migrations reach staging via `.github/workflows/deploy-staging.yml`;
production is promoted deliberately, by hand.

## Documentation

| Document | For |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Architectural decisions and the reasoning behind them. Read before adding anything. |
| [docs/FUNCTIONALITY.md](./docs/FUNCTIONALITY.md) | What is built, planned, and deliberately deferred — and where it lives. |
| [docs/PATTERNS.md](./docs/PATTERNS.md) | The canonical way to do each recurring thing, plus the decision log. |

All three are updated in the same commit as the change they describe.
