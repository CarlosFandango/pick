import { AUDIT_TYPE_LABELS, joinWords } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { AuditorRoster } from '@/components/admin/AuditorRoster';
import { VettingCard } from '@/components/admin/VettingCard';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, metaLabel, pageTitle } from '@/lib/theme';
import { AuditorActions } from './AuditorActions';
import { InviteAuditor } from './InviteAuditor';

/**
 * S4.3 — the auditor roster.
 *
 * The screen the `vetting` row in the ops queue points at, and the gate the
 * whole marketplace hangs on: an auditor who is not approved is never offered
 * anything, so nothing else in the network moves until someone looks here.
 *
 * Pending first, always. This is a queue before it is a directory.
 *
 * Real names, deliberately. Coded identities exist to stop a *charity*
 * building a picture of an individual over time; PICK is the party doing the
 * vetting and cannot do it against a hash.
 */
export default async function AuditorsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: roster } = await supabase.rpc('auditor_roster');
  const rows = roster ?? [];

  // Two different things, and the queue only counts one of them. Somebody who
  // has not opened their invitation cannot be vetted, so counting them would
  // make the ops queue point at work that does not exist yet.
  const invited = rows.filter((r) => r.user_status === 'invited');
  const onNetwork = rows.filter((r) => r.user_status !== 'invited');
  const waiting = onNetwork.filter((r) => r.approval_status === 'pending');
  const approved = onNetwork.filter((r) => r.approval_status === 'approved');
  const pending = waiting.length;

  // Where the network would have nobody without this person.
  //
  // Computed here rather than in the roster function because the answer is
  // about the whole set, and the whole set is already on this page. It is a
  // narrow version of the coverage-gap analysis the design asks for on ops
  // home — that one has to answer "nowhere covers X for lottery", which needs
  // the audit side too, and is a real build rather than a set difference.
  const coveredByApproved = new Set(approved.flatMap((a) => a.areas));
  const soleCover = (areas: string[]) => areas.filter((area) => !coveredByApproved.has(area));

  const first = waiting[0];
  const firstSoleCover = first ? soleCover(first.areas) : [];

  return (
    <AdminChrome who={session.fullName} queuePosition={`${pending} AWAITING VETTING`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Auditors</h1>
          <span style={metaLabel}>
            {onNetwork.length} on the network · {pending} awaiting vetting
            {invited.length > 0 ? ` · ${invited.length} not yet accepted` : ''}
          </span>
        </div>

        {pending === 0 ? (
          <Lede
            tone="clear"
            meta="Nothing to vet"
            headline="Everyone who has applied has been looked at."
            detail={`${approved.length} approved auditors are on the network.`}
          />
        ) : (
          <Lede
            tone="attention"
            meta={pending === 1 ? '1 waiting' : `${pending} waiting`}
            headline={
              pending === 1
                ? firstSoleCover.length > 0
                  ? `One auditor is waiting on you, and it is holding up ${joinWords(firstSoleCover)}.`
                  : 'One auditor is waiting on you.'
                : `${pending} auditors are waiting on you.`
            }
            detail={
              first && firstSoleCover.length > 0
                ? `${first.full_name || first.email} is the only person who covers ${joinWords(firstSoleCover)}.`
                : 'Nobody is offered work until they are approved.'
            }
          />
        )}

        {waiting.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={metaLabel}>Waiting to be vetted</span>
            {waiting.map((a) => (
              <VettingCard
                key={a.auditor_id}
                subject={{
                  auditorId: a.auditor_id,
                  fullName: a.full_name,
                  email: a.email,
                  appliedAt: a.applied_at,
                  basePlace: a.base_place,
                  basePostcode: a.base_postcode,
                  maxTravelMinutes: a.max_travel_minutes,
                  travelMode: a.travel_mode,
                  areas: a.areas,
                  auditTypes: a.audit_types,
                  avCapable: a.av_capable,
                  rightToWorkCheckedOn: a.right_to_work_checked_on,
                  dbsCheckedOn: a.dbs_checked_on,
                  soleCoverFor: soleCover(a.areas),
                }}
                actions={<AuditorActions auditorId={a.auditor_id} status={a.approval_status} />}
              />
            ))}
          </section>
        ) : null}

        <InviteAuditor />

        {invited.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={metaLabel}>Invited — not yet accepted</span>
            {invited.map((a) => (
              <p key={a.auditor_id} style={{ margin: 0, fontSize: 13 }}>
                {/* The email is the only identity an invitee has until they
                    accept and choose a name. Without it these rows are
                    indistinguishable and nobody can be chased. */}
                {a.full_name || a.email}
              </p>
            ))}
          </section>
        ) : null}

        <AuditorRoster
          auditors={onNetwork
            .filter((a) => a.approval_status !== 'pending')
            .map((a) => ({
            auditorId: a.auditor_id,
            fullName: a.full_name,
            approvalStatus: a.approval_status,
            basePostcode: a.base_postcode,
            avCapable: a.av_capable,
            areas: a.areas,
            methodologies: a.audit_types.map((t) => AUDIT_TYPE_LABELS[t]),
            auditsCompleted: a.audits_completed,
            openConflicts: a.open_conflicts,
            }))}
          actions={(auditor) => (
            <AuditorActions auditorId={auditor.auditorId} status={auditor.approvalStatus} />
          )}
        />
      </div>
    </AdminChrome>
  );
}
