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
pnpm db:start     # local Supabase — needs Docker
pnpm env:local    # writes .env, apps/portal/.env.local, apps/field/.env
pnpm db:types     # generate Database types from the local schema
pnpm dev
```

`pnpm env:local` reads the keys straight from the running stack. They change
every time the stack is recreated, so generate them rather than copying by hand;
`.env.example` documents the shape, not the values.

Verify with `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — the same
four things CI runs. `build` is not optional: bundlers resolve modules
differently from `tsc`, so it catches what typechecking cannot.

| Service | URL |
|---|---|
| Portal | http://127.0.0.1:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit | http://127.0.0.1:54324 |

### Running the field app

```bash
pnpm --filter @picksel/field dev
```

In a simulator `127.0.0.1` reaches your machine. On a physical device it does
not — set `EXPO_PUBLIC_SUPABASE_URL` to your LAN address (`http://192.168.x.x:54321`).

**iOS simulator.** Expo needs `xcrun simctl`, which exists only when the active
developer directory is full Xcode rather than the Command Line Tools — and
`/Library/Developer/CommandLineTools` is a common default (`xcode-select -p`
shows yours).

The `dev` script handles it: it sets `DEVELOPER_DIR` to the standard Xcode
location unless you have already set it, so no `sudo` is needed. If your Xcode
lives elsewhere, export `DEVELOPER_DIR` yourself and the script defers to it.

To fix it machine-wide instead, run this in a real terminal — it needs a TTY for
the password, so it will not work from an editor-embedded shell:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Either way Metro runs and Expo Go on a physical device works; only the simulator
depends on this.

**Android** needs the SDK and `ANDROID_HOME`; not set up yet.

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
