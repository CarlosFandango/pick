import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { color } from '@picksel/tokens';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, hairline, metaLabel, pageTitle } from '@/lib/theme';
import { StageControls } from './StageControls';

/**
 * The stages an audit runs in, and what each one permits.
 *
 * An audit is roughly 45 minutes watching a team from a distance, then a
 * 15 minute mystery shop as a participant. The constraint that separates them
 * is discretion, not subject matter: a bystander can hold a phone, and someone
 * being pitched to cannot. So a stage declares what may be captured during it
 * and the field app reads that rather than assuming.
 *
 * Until TND-83 those declarations were a Postgres enum and a `switch` in
 * `core/stages.ts`. This screen exists so that changing them is a decision
 * someone at PICK makes, rather than a release.
 *
 * The sequence below is read-only. Reordering it is a real piece of work —
 * every audit pins the stage version it ran under, so an edit has to publish a
 * new version rather than move rows an in-flight shift is reading. Showing it
 * unedited is honest; a control that silently rewrote history would not be.
 */
export default async function StagesPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const [stages, sequence] = await Promise.all([
    supabase
      .from('audit_capture_mode')
      .select(
        'key, label, sort_order, allows_tallies, allows_notes, allows_markers, caution, is_active',
      )
      .order('sort_order'),
    supabase
      .from('audit_stage_template')
      .select('audit_type, sequence, key, label, capture_mode, duration_hint_minutes')
      .eq('is_active', true)
      .order('audit_type')
      .order('sequence'),
  ]);

  const byType = new Map<string, NonNullable<typeof sequence.data>>();
  for (const step of sequence.data ?? []) {
    const list = byType.get(step.audit_type) ?? [];
    list.push(step);
    byType.set(step.audit_type, list);
  }

  return (
    <AdminChrome who={session.fullName} queuePosition="AUDIT STAGES">
      <div style={{ ...adminPage, maxWidth: 820 }}>
        <BackLink href="/admin" label="Ops home" />
        <h1 style={pageTitle}>Audit stages</h1>

        <p style={intro}>
          Each stage says what an auditor may do while they are in it. The field app reads these — a
          stage that does not allow tallies shows no counters at all.
        </p>

        <ul style={list}>
          {(stages.data ?? []).map((stage) => (
            <li
              key={stage.key}
              style={{
                ...card,
                padding: 16,
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                opacity: stage.is_active ? 1 : 0.6,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {stage.label}
                  <span style={{ ...metaLabel, marginLeft: 8 }}>{stage.key}</span>
                </div>

                {/*
                  The reason travels with the setting. Whoever changes this in a
                  year will not have read the spec, and a bare toggle gives them
                  nothing to weigh against convenience.
                */}
                {stage.caution ? (
                  <p style={caution}>{stage.caution}</p>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: color.bodyBrown }}>
                    The auditor is at a distance and can be seen holding a phone without changing
                    what they are watching.
                  </p>
                )}
              </div>

              <StageControls
                stage={{
                  key: stage.key,
                  isActive: stage.is_active,
                  allowsTallies: stage.allows_tallies,
                  allowsNotes: stage.allows_notes,
                  allowsMarkers: stage.allows_markers,
                }}
              />
            </li>
          ))}
        </ul>

        <h2 style={{ ...pageTitle, fontSize: 16, marginTop: 8 }}>Sequence</h2>
        <p style={intro}>
          The order an auditor works through, per methodology, and which stage each step runs in.
          Read-only: an audit pins the sequence it ran under, so changing this has to publish a new
          version rather than move rows underneath a shift in progress.
        </p>

        {[...byType.entries()].map(([auditType, steps]) => (
          <div key={auditType} style={{ ...card, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              {AUDIT_TYPE_LABELS[auditType as keyof typeof AUDIT_TYPE_LABELS] ?? auditType}
            </div>
            <ol style={{ ...list, gap: 0, paddingLeft: 0, listStyle: 'none' }}>
              {steps.map((step) => (
                <li key={step.key} style={step_}>
                  <span style={{ ...metaLabel, minWidth: 24 }}>{step.sequence}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{step.label}</span>
                  {step.duration_hint_minutes ? (
                    <span style={{ fontSize: 12.5, color: color.muted }}>
                      {step.duration_hint_minutes} min
                    </span>
                  ) : null}
                  <span style={{ ...metaLabel, minWidth: 88, textAlign: 'right' }}>
                    {step.capture_mode}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </AdminChrome>
  );
}

const intro = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  color: color.bodyBrown,
  maxWidth: 620,
} as const;

const caution = {
  margin: '4px 0 0',
  fontSize: 13,
  lineHeight: 1.6,
  color: color.bodyBrown,
} as const;

const list = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
} as const;

const step_ = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '7px 0',
  borderBottom: hairline,
} as const;
