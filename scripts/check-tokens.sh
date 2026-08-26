#!/usr/bin/env bash
# The design-system rules that a type checker cannot see.
#
# CLAUDE.md: "A literal #0B5FFF, padding: 12 or fontSize: 20 in a component is a
# bug." Biome cannot express that and tsc has no opinion, so it is checked here,
# beside check-secrets.sh, for the same reason: cheap, greppable, and it fails
# the build rather than a review.
#
# Scoped to colour today. Colour is the one where a single literal survives a
# rebrand and quietly renders the old brand, and where the fix is always the
# same — reference a role. The type scale is a wider job with a decision in it
# (the portal renders sizes the scale does not contain) and is not enforced yet.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { echo "  FAIL: $1" >&2; fail=1; }

echo "checking design tokens..."

# design/tokens is the drop itself; packages/tokens maps it onto roles and its
# test needs literals to compute contrast. Everywhere else references a role.
allowed='^design/|^packages/tokens/'

offenders=$(git grep -InE "'#[0-9a-fA-F]{3,8}'|\"#[0-9a-fA-F]{3,8}\"|\`#[0-9a-fA-F]{3,8}\`" \
  -- 'apps/**/*.ts' 'apps/**/*.tsx' 'packages/**/*.ts' 'packages/**/*.tsx' 2>/dev/null \
  | grep -vE "$allowed" || true)

if [ -n "$offenders" ]; then
  report "colour literal outside the design tokens — use a role from @picksel/tokens"
  echo "$offenders" | sed 's/^/    /' >&2
fi

if [ "$fail" -eq 0 ]; then echo "  ok"; fi
exit "$fail"
