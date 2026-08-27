import { routeFor } from '@picksel/core';
import { color, fontSize, fontWeight } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, metaLabel, mono, pageTitle } from '@/lib/theme';
import { ComplaintActions } from './ComplaintActions';

/**
 * S4.6 — one complaint.
 *
 * Minimal on purpose. TND-80 turns this into a triage queue: three paths, a
 * PICK-authored rework instruction, and the rule that a client's raw words are
 * never forwarded to an auditor. Those are new entities beside the complaint
 * rather than a replacement for it, so this reads and moves the status that
 * already exists and stops short of inventing a triage vocabulary that spec
 * will define.
 *
 * It exists now because the ops queue linked here and got a 404, and a queue
 * whose rows go nowhere is worse than no queue.
 */
export default async function ComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: complaint } = await supabase
    .from('complaint')
    .select(
      'id, subject, status, body, raised_at, resolution, audit_id, organisation_id, raised_by',
    )
    .eq('id', id)
    .maybeSingle();

  if (!complaint) notFound();

  const [{ data: organisation }, { data: raisedBy }] = await Promise.all([
    supabase.from('organisation').select('name').eq('id', complaint.organisation_id).single(),
    complaint.raised_by
      ? supabase
          .from('user_profile')
          .select('full_name')
          .eq('id', complaint.raised_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const route = routeFor(complaint.subject);

  return (
    <AdminChrome who={session.fullName} queuePosition={complaint.status.toUpperCase()}>
      <div style={{ ...adminPage, maxWidth: 760 }}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>{route.title}</h1>
          <span style={metaLabel}>
            {organisation?.name ?? '—'} · {raisedBy?.full_name ?? 'unknown'}
          </span>
          <span style={{ ...metaLabel, marginLeft: 'auto', fontFamily: mono }}>
            {new Date(complaint.raised_at).toLocaleDateString('en-GB')}
          </span>
        </div>

        <section style={{ ...card, padding: 18 }}>
          <div style={metaLabel}>What they told us</div>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: fontSize.sm,
              lineHeight: 1.6,
              color: color.ink,
              whiteSpace: 'pre-wrap',
            }}
          >
            {complaint.body}
          </p>
        </section>

        {complaint.audit_id ? (
          <Link
            href={`/admin/audits/${complaint.audit_id}`}
            style={{
              color: color.link,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              textDecoration: 'none',
            }}
          >
            The audit it is about
          </Link>
        ) : null}

        {complaint.resolution ? (
          <section style={{ ...card, borderTop: `5px solid ${color.teal}`, padding: 18 }}>
            <div style={metaLabel}>How it was resolved</div>
            <p style={{ margin: '8px 0 0', fontSize: fontSize.sm, lineHeight: 1.6 }}>
              {complaint.resolution}
            </p>
          </section>
        ) : (
          <ComplaintActions complaintId={complaint.id} status={complaint.status} />
        )}
      </div>
    </AdminChrome>
  );
}
