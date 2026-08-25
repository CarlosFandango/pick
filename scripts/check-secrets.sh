#!/usr/bin/env bash
# Fast, dependency-free checks for the mistakes that end companies.
#
# Not a security audit — a tripwire for the specific errors that are easy to
# make, invisible in review, and catastrophic in production. Runs in CI.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { echo "  FAIL: $1" >&2; fail=1; }

echo "checking committed secrets..."

# 1. A real .env must never be tracked. .env.example is the only allowed one.
tracked=$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)
[ -n "$tracked" ] && report "env file is tracked by git: $tracked"

# 2. Credential-shaped strings anywhere in tracked files.
leaked=$(git grep -lIE '(eyJ[A-Za-z0-9_-]{30,}\.|sbp_[A-Za-z0-9]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)' -- . 2>/dev/null || true)
[ -n "$leaked" ] && report "credential-shaped string in: $leaked"

# 3. The service-role key bypasses RLS entirely. It may be named only where it
#    is read on the server. Anywhere else — especially apps/field, which ships
#    to devices we do not control — is a data breach waiting to happen.
# Named legitimately: the server client reads it, turbo passes it through, the
# local-env script writes it, and the docs explain it.
allowed='packages/api/src/server\.ts|\.env\.example|turbo\.json|scripts/|\.github/workflows/|CLAUDE\.md|README\.md|docs/'
offenders=$(git grep -lI 'SUPABASE_SERVICE_ROLE_KEY' -- . 2>/dev/null | grep -vE "$allowed" || true)
[ -n "$offenders" ] && report "service-role key referenced outside server code: $offenders"

# 4. The field app must never reach the admin client at all.
field=$(git grep -lI 'createAdminClient\|api/server' -- apps/field 2>/dev/null || true)
[ -n "$field" ] && report "apps/field references the service-role path: $field"

# 5. Bank details belong to the payout rail, never to us. We store an opaque
#    payout_reference; a column named like an account is a red flag.
banky=$(git grep -lIE '\b(sort_code|account_number|iban|card_number|cvv)\b' -- packages/db 2>/dev/null || true)
[ -n "$banky" ] && report "possible bank details in the schema: $banky"

if [ "$fail" -eq 0 ]; then echo "  ok"; fi
exit "$fail"
