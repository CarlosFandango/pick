#!/usr/bin/env bash
# Every route the portal links to has to exist.
#
# Six did not: the Reports tab on every client screen, the /admin/review the
# three review actions redirected to on success, and four of the six actions on
# the ops home. All of them typecheck perfectly — a route is a string, and Next
# resolves it at request time — so nothing in lint, tsc or the unit tests has an
# opinion. The Playwright suite walks the booking spine and the role gates, and
# would not have found any of them either.
#
# Static on purpose: it needs no server, no database and no browser, so it runs
# in the same cheap CI job as the secret and token tripwires rather than the
# expensive one.
set -uo pipefail
cd "$(dirname "$0")/.."

APP=apps/portal/src/app
fail=0

echo "checking portal routes..."

# Every route the app actually serves, as a matching pattern: a [param]
# directory matches one segment, a (group) directory contributes nothing.
patterns=$(
  find "$APP" -name 'page.tsx' -print \
    | sed -e "s|^$APP||" -e 's|/page\.tsx$||' -e 's|^$|/|' \
    | sed -e 's|/([^/]*)|/|g' -e 's|//|/|g' \
    | sed -e 's|\[[^]]*\]|[^/]+|g' \
    | sort -u
)

# Everything the app links to or redirects to.
#
# Collected as route-shaped string literals rather than by looking for `href`,
# because there are at least five spellings — href="/x", href: '/x' in a tabs
# array, href={`/x/${id}`}, redirect('/x'), and href: (item) => `/x/${id}` in
# core. An earlier version of this check anchored on `href=` and missed the
# Reports tab and every link on the ops home.
#
# packages/core/src/ops.ts is in scope because OPS_PRESENTATION holds the ops
# home's links and four of them pointed at routes nobody had built. It is named
# rather than globbed so a storage path elsewhere in core is not mistaken for a
# route.
#
# Template holes become one segment; query strings and hashes are dropped, so
# `/audits?booked=PS-1` is a link to /audits.
targets=$(
  git grep -hoE "[\"'\`]/[A-Za-z][^\"'\`]*" \
    -- 'apps/portal/src' 'packages/core/src/ops.ts' 2>/dev/null \
    | sed -e 's|^.||' \
    | sed -e 's|\${[^}]*}|SEGMENT|g' -e 's|[?#].*$||' \
    | sort -u
)

for target in $targets; do
  probe=${target//SEGMENT/x}
  matched=0
  while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue
    if [[ "$probe" =~ ^${pattern}$ ]]; then matched=1; break; fi
  done <<< "$patterns"

  if [ "$matched" -eq 0 ]; then
    echo "  FAIL: $target is linked to, and no page.tsx serves it" >&2
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "  ok ($(echo "$targets" | grep -c .) targets, $(echo "$patterns" | grep -c .) routes)"
fi
exit "$fail"
