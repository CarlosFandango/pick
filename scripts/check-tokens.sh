#!/usr/bin/env bash
# The design-system rules that a type checker cannot see.
#
# CLAUDE.md: "A literal #0B5FFF, padding: 12 or fontSize: 20 in a component is a
# bug." Biome cannot express that and tsc has no opinion, so it is checked here,
# beside check-secrets.sh, for the same reason: cheap, greppable, and it fails
# the build rather than a review.
#
# Two rules, both of which a component can break while typechecking perfectly:
# a colour literal survives a rebrand and quietly renders the old brand, and a
# font size picked by hand puts the two apps out of step with each other and
# with the mockups. Both fixes are the same shape — reference the token.
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

# The type scale is six steps. Sixteen distinct sizes were in use, none of them
# from it, and `webTextStyle()` was called once in the whole portal — so the
# guarantee that "neither app picks a number, so neither can drift" was not
# holding in either app.
sizes=$(git grep -InE "(fontSize|fontWeight): [0-9]" \
  -- 'apps/**/*.ts' 'apps/**/*.tsx' 'packages/**/*.ts' 'packages/**/*.tsx' 2>/dev/null \
  | grep -vE "$allowed" || true)

if [ -n "$sizes" ]; then
  report "font size or weight picked by hand — use fontSize/fontWeight from @picksel/tokens"
  echo "$sizes" | sed 's/^/    /' >&2
fi

if [ "$fail" -eq 0 ]; then echo "  ok"; fi
exit "$fail"
