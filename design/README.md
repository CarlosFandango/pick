# design/
Source of truth for PICKsel UI. Maintained in Claude Design; committed here for the build.

- manifest.md — stable screen IDs + routes. Check version on every design commit.
- mockups/ — reviewable HTML mockups (open in browser). Inline-styled; safe to read as code.
- tokens/ — colors/typography/spacing as CSS + tokens.ts for Next.js and React Native.

Iteration loop:
1. Feedback → designs updated in Claude Design → new design/ drop committed (manifest version bumps).
2. Claude Code: diff manifest + mockups, update matching routes/components only.
3. Claude Design can read this repo to sync mockups against built reality.

## Where the mockups live

`mockups/` is empty on purpose for now. The HTML lives in the Claude Design
project and is read from there on demand:

    project: "UI mockups and scoping"
    id:      ac18593f-81b1-4150-bf31-4f0e15863e26
    files:   PICKsel Phase 1 - Golden Path.dc.html
             PICKsel Phase 2 - Auditors World.dc.html
             PICKsel Phase 3 - Clients World.dc.html

Claude Code reads them with the claude-design MCP (`read_file`), which is the
same source the manifest is generated from. Copying 110 KB of entity-escaped
HTML through a chat context to land it here risks corrupting the very spec we
build against — a stale or mangled mockup is worse than no local copy.

Drop the real files in when there is a reason to (offline review, diffing a new
drop) and delete this section.

Fonts (Archivo + IBM Plex Mono, OFL) are also not committed: ~1.8 MB of binaries
for a brand that is mid-rebrand. Mockups fall back to system faces; metrics
differ slightly, structure — which is what we build from — does not.
