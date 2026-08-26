import { color } from '@picksel/tokens';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, metaLabel, pageTitle } from '@/lib/theme';
import { GateControls } from './GateControls';

/** What each trigger actually means, in a sentence a reviewer can act on. */
const EXPLANATION: Record<string, string> = {
  auditor_first_n_audits: 'An auditor who has not built a track record yet.',
  auditor_first_of_type: 'A proven auditor doing a methodology they have not done before.',
  client_first_audit: 'The first audit a charity ever receives from us.',
  audit_type_is_lottery: 'Lottery fundraising carries external regulatory exposure.',
  assignment_has_open_risk: 'An assignment carrying a risk nobody has advised on yet.',
  manual: 'Flagged by PICK during review.',
};

/**
 * The review gates.
 *
 * One configurable primitive, replacing per-auditor payment tiers. Tiers only
 * ever handled auditor trust; a gate handles risk from any source.
 *
 * The two things a gate can hold are independent and must stay that way. A
 * quality hold must never become a pay delay — if an auditor's fee waits on
 * anything about how the audit was received, they are being paid to keep the
 * subject of the audit happy, which is the structure this product exists to
 * argue against.
 *
 * There is no way to author a trigger here, deliberately. Adding one is a code
 * change reviewed like any other.
 */
export default async function GatesPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: gates } = await supabase
    .from('review_gate')
    .select('trigger, mode, scope, enabled, threshold, timeout_days, on_timeout')
    .order('trigger');

  return (
    <AdminChrome who={session.fullName} queuePosition="REVIEW GATES">
      <div style={{ ...adminPage, maxWidth: 820 }}>
        <BackLink href="/admin" label="Ops home" />
        <h1 style={pageTitle}>Review gates</h1>

        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: color.bodyBrown,
            maxWidth: 620,
          }}
        >
          A gate can hold an auditor's <b>payment</b>, the <b>client's copy</b> of the report, or
          both — and the two resolve independently. Holding a report never delays a fee.
        </p>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {(gates ?? []).map((gate) => (
            <li
              key={gate.trigger}
              style={{
                ...card,
                padding: 16,
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                opacity: gate.enabled ? 1 : 0.6,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {gate.trigger.replace(/_/g, ' ')}
                  {gate.threshold ? (
                    <span style={{ ...metaLabel, marginLeft: 8 }}>FIRST {gate.threshold}</span>
                  ) : null}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: color.bodyBrown }}>
                  {EXPLANATION[gate.trigger] ?? ''}
                </p>
                {gate.mode === 'hold' ? (
                  <p style={{ margin: '6px 0 0', fontSize: 12.5, color: color.muted }}>
                    Held for up to {gate.timeout_days} days, then{' '}
                    {gate.on_timeout.replace('_', ' ')}. A gate with no timeout puts auditors back
                    to waiting on one person being available.
                  </p>
                ) : null}
              </div>

              <GateControls
                trigger={gate.trigger}
                enabled={gate.enabled}
                mode={gate.mode}
                scope={gate.scope}
              />
            </li>
          ))}
        </ul>
      </div>
    </AdminChrome>
  );
}
