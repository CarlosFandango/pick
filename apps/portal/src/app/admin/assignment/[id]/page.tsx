import {
  assignmentLede,
  AUDIT_TYPE_LABELS,
  type Considered,
  ELIGIBILITY_TESTS,
  passes,
  TEST_FAILURES,
  TEST_LABELS,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, bodyText, hairline, metaLabel, mono } from '@/lib/theme';
import { OfferButton } from './OfferButton';

/**
 * S4.2 — the assignment console.
 *
 * The algorithm shows its work: everyone considered, and which of the six
 * tests each one failed.
 *
 * THE ONE SCREEN IN THE DROP THAT GETS A TABLE. The verdict-first pattern
 * needs the content to have a real order, and six independent eligibility
 * rules have none — there is no chronology to read down. Forcing a timeline
 * onto them would be worse than the flat list this replaces.
 *
 * What the columns buy: five auditors each failing the SAME test is a fact
 * about the network — nobody covers this place — and it was invisible when
 * every row read as its own sentence of excuses.
 */
export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, window_start_on, window_end_on, requires_av',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const { data: pool } = await supabase.rpc('assignment_console', { p_audit_id: id });

  const rows = pool ?? [];
  const eligible = rows.filter((row) => row.eligible);
  const considered: (Considered & { auditorId: string; offerState: string | null })[] = rows.map(
    (row) => ({
      auditorId: row.auditor_id,
      offerState: row.offer_state,
      eligible: row.eligible,
      approved: row.approved,
      reachable: row.reachable,
      capable: row.capable,
      available: row.available,
      exposureOk: row.exposure_ok,
      noConflict: row.no_conflict,
    }),
  );
  const offered = rows.filter((row) => row.offer_state === 'offered').length;

  return (
    <AdminChrome
      who={session.fullName}
      queuePosition={`ASSIGNMENT · ${audit.reference} · ${audit.postcode}`}
    >
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', margin: 0 }}>
            {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode}
          </h1>
          <span style={{ ...metaLabel }}>
            {eligible.length} eligible of {rows.length} active
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 11, color: color.muted }}>
            WINDOW {audit.window_start_on} → {audit.window_end_on}
            {audit.requires_av ? ' · A/V REQUIRED' : ''}
          </span>
        </div>

        {audit.status === 'booked' ? <OfferButton auditId={audit.id} /> : null}

        <Lede {...assignmentLede(considered, offered)} />

        <section>
          <div style={{ ...metaLabel, marginBottom: 4 }}>Everyone considered, and why</div>
          <p style={{ ...bodyText, margin: '0 0 12px', maxWidth: '68ch' }}>
            Six independent tests. An auditor has to pass all of them — the first column that fails
            is the one to fix.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 760,
                borderCollapse: 'collapse',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr>
                  <th scope="col" style={{ ...metaLabel, padding: '0 12px 8px 0' }}>
                    Auditor
                  </th>
                  {ELIGIBILITY_TESTS.map((test) => (
                    <th key={test} scope="col" style={{ ...metaLabel, padding: '0 12px 8px 0' }}>
                      {TEST_LABELS[test]}
                    </th>
                  ))}
                  <th scope="col" style={{ ...metaLabel, padding: '0 0 8px' }}>
                    <span style={{ position: 'absolute', left: -9999 }}>Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {considered.map((row) => (
                  <tr key={row.auditorId} style={{ borderTop: hairline }}>
                    <td style={{ padding: '11px 12px 11px 0', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: mono, fontSize: 11.5 }}>
                        {row.auditorId.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    {ELIGIBILITY_TESTS.map((test) => {
                      const ok = passes(row, test);
                      return (
                        <td key={test} style={{ padding: '11px 12px 11px 0' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              border: `1px solid ${ok ? color.oat : color.creativeText}`,
                              background: ok ? 'transparent' : color.paper,
                              color: ok ? color.muted : color.creativeText,
                              borderRadius: radius.pill,
                              padding: '3px 10px',
                              fontFamily: mono,
                              fontSize: 10,
                              letterSpacing: '0.06em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ok ? 'Yes' : TEST_FAILURES[test].says}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ padding: '11px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {row.offerState ? (
                        <span style={{ ...metaLabel }}>{row.offerState}</span>
                      ) : row.eligible ? (
                        <span style={{ ...metaLabel, color: color.teal }}>Eligible</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminChrome>
  );
}
