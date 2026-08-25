# @picksel/db

Schema, migrations and generated types.

## Working on the schema

```bash
pnpm db:start                 # local Supabase
pnpm db:reset                 # re-apply every migration + seed, from scratch
pnpm db:diff <name>           # capture Studio changes as a new migration
pnpm db:types                 # regenerate src/types.generated.ts
```

Always finish with `pnpm db:types` — the whole monorepo types against that file.

## Rules

- One migration per concern; name it for what it does.
- **Never edit a migration that has been pushed to staging.** Write a new one.
- `seed.sql` must stay idempotent: `db:reset` runs it every time.
- Anything append-only (`observation_log`, `check_result`, `credit_transaction`)
  needs both the `REVOKE` and the trigger. One without the other is a gap.

## Linking a hosted project

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF_STAGING"
supabase db push
```
