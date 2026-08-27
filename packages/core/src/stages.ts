import type { AuditMoment } from './moments';

/**
 * An audit is two phases with different capture modes (TND-78, TND-83).
 *
 * Roughly 45 minutes observing the team from a distance, then a 15 minute
 * mystery shop as a participant. The consequence that drives everything here:
 * **the discretion constraint is not uniform.** A bystander can hold a phone.
 * Someone being pitched to cannot. So a stage declares what may be captured
 * during it, and the screen reads that rather than assuming.
 *
 * The stage list is data, seeded per audit type in `audit_stage_template`.
 * Nothing here hardcodes a sequence.
 */
/**
 * Deliberately a string, not a union of the two we ship with.
 *
 * The stage list is configuration (`audit_capture_mode`), so a third stage is
 * a row rather than a release. Closing this type would put the list back in
 * the code, which is the thing TND-83 exists to undo. The safety that a union
 * would have given moves to `StagePermissions`, which is the part any caller
 * actually branches on.
 */
export type CaptureMode = string;

export interface AuditStage {
  key: string;
  label: string;
  sequence: number;
  captureMode: CaptureMode;
  /** What may be captured during this stage. Configuration, not a constant. */
  permissions: StagePermissions;
  /** The moment whose checks belong to this stage. Null on a tally stage. */
  moment: AuditMoment | null;
  durationHintMinutes: number | null;
}

export type FlagSeverity = 'wrong' | 'note' | 'fine';

/** Something counted during an observation stage — approaches, stops, asks. */
export interface StageTally {
  stageKey: string;
  counterKey: string;
  occurredAt: Date;
}

/** A one-tap compliance marker, or a flag raised mid-interaction. */
export interface Marker {
  id: string;
  stageKey: string;
  severity: FlagSeverity;
  occurredAt: Date;
}

export interface StageEntry {
  stageKey: string;
  enteredAt: Date;
}

export interface StagedSession {
  startedAt: Date;
  endedAt: Date | null;
  entries: StageEntry[];
  tallies: StageTally[];
  markers: Marker[];
}

/**
 * What an auditor may physically do during a stage.
 *
 * As shipped, `interaction` allows a marker and nothing else — the spec
 * permits "a single discreet marker at most". Tallies and notes require
 * looking at a screen for long enough to be noticed by the person pitching to
 * you.
 *
 * That is a seeded row rather than a rule here, so it can be changed without a
 * release. The reason it is set that way is recorded as `caution` on the row,
 * where whoever changes it will see it.
 */
export interface StagePermissions {
  tallies: boolean;
  notes: boolean;
  markers: boolean;
}

/**
 * Kept as a function rather than reading `stage.permissions` at each call
 * site. It is the one name every screen asks through, so where permissions
 * come from stays a single decision — which is how they moved out of here to
 * the database without any caller changing.
 */
export function permissions(stage: AuditStage): StagePermissions {
  return stage.permissions;
}

export function startStagedSession(stages: readonly AuditStage[], at: Date): StagedSession {
  const first = ordered(stages)[0];
  return {
    startedAt: at,
    endedAt: null,
    entries: first ? [{ stageKey: first.key, enteredAt: at }] : [],
    tallies: [],
    markers: [],
  };
}

export function ordered(stages: readonly AuditStage[]): AuditStage[] {
  return [...stages].sort((a, b) => a.sequence - b.sequence);
}

export function currentStage(
  stages: readonly AuditStage[],
  session: StagedSession,
): AuditStage | null {
  const key = session.entries.at(-1)?.stageKey;
  return stages.find((s) => s.key === key) ?? null;
}

export function isLastStage(stages: readonly AuditStage[], session: StagedSession): boolean {
  const current = currentStage(stages, session);
  return current !== null && current.key === ordered(stages).at(-1)?.key;
}

/**
 * Move to the next stage. Forward only.
 *
 * An auditor cannot go back, because the interaction cannot: a mis-tap is
 * corrected in write-up, where there is time to think, rather than by fiddling
 * with a phone in front of the person being observed.
 */
export function advanceStage(
  stages: readonly AuditStage[],
  session: StagedSession,
  at: Date,
): StagedSession {
  const list = ordered(stages);
  const current = currentStage(stages, session);
  if (!current) return session;

  const next = list[list.findIndex((s) => s.key === current.key) + 1];
  if (!next) return session;

  return { ...session, entries: [...session.entries, { stageKey: next.key, enteredAt: at }] };
}

/** Refused outside an observation stage — the rule, not a UI preference. */
export function addTally(
  stages: readonly AuditStage[],
  session: StagedSession,
  tally: StageTally,
): StagedSession {
  const stage = stages.find((s) => s.key === tally.stageKey);
  if (!stage || !permissions(stage).tallies) return session;
  return { ...session, tallies: [...session.tallies, tally] };
}

export function addMarker(session: StagedSession, marker: Marker): StagedSession {
  return { ...session, markers: [...session.markers, marker] };
}

export function endStagedSession(session: StagedSession, at: Date): StagedSession {
  return { ...session, endedAt: at };
}

export function tallyCount(session: StagedSession, stageKey: string, counterKey: string): number {
  return session.tallies.filter((t) => t.stageKey === stageKey && t.counterKey === counterKey)
    .length;
}

export interface StageRow {
  stage: AuditStage;
  index: number;
  state: 'done' | 'current' | 'upcoming';
  enteredAt: Date | null;
  markerCount: number;
}

/** Every stage, in order, with where the auditor has got to. */
export function stageRows(stages: readonly AuditStage[], session: StagedSession): StageRow[] {
  const current = currentStage(stages, session);
  const enteredAt = new Map(session.entries.map((e) => [e.stageKey, e.enteredAt]));
  const markers = new Map<string, number>();
  for (const m of session.markers) {
    markers.set(m.stageKey, (markers.get(m.stageKey) ?? 0) + 1);
  }

  return ordered(stages).map((stage, index) => ({
    stage,
    index: index + 1,
    state: stage.key === current?.key ? 'current' : enteredAt.has(stage.key) ? 'done' : 'upcoming',
    enteredAt: stage.key === current?.key ? null : (enteredAt.get(stage.key) ?? null),
    markerCount: markers.get(stage.key) ?? 0,
  }));
}

/**
 * Which stage a check belongs to.
 *
 * Resolved through the moment the check already carries, rather than a second
 * column on the check — one place per fact, and it means a stage list can be
 * rearranged without touching the catalogue.
 */
export function stageForMoment(
  stages: readonly AuditStage[],
  moment: AuditMoment,
): AuditStage | null {
  return stages.find((s) => s.moment === moment) ?? null;
}

/** "00:42:17" — tabular, unambiguous, readable at arm's length. */
export function elapsedSince(from: Date, to: Date): string {
  const seconds = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

/** "11:41" — when a stage was entered. */
export function clockTime(at: Date): string {
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}
