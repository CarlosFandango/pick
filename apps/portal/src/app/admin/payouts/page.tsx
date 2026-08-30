import { DEFAULT_CURRENCY, isPayableNow, payoutsLede } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { PayableList, RunList } from '@/components/admin/PayoutRuns';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, metaLabel, pageTitle } from '@/lib/theme';
import { BuildRun } from './BuildRun';
import { RunActions } from './RunActions';

/**
 * S4.7 — money out.
 *
 * What decides whether an audit is payable is the review gate, NOT whether the
 * client accepted the findings. An auditor whose fee waits on the subject of
 * the audit being happy with it has a reason to write a softer audit, which is
 * the structure this product exists to argue against — one layer down.
 *
 * So a client-release hold appears nowhere on this screen. That absence is the
 * design.
 */
export default async function PayoutsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const [{ data: payable }, { data: runs }] = await Promise.all([
    supabase.rpc('payable_audits'),
    supabase
      .from('payout_run')
      .select(
        'id, reference, period_start, period_end, status, total_minor_units, external_reference',
      )
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const runIds = (runs ?? []).map((r) => r.id);
  const { data: lines } = await supabase
    .from('payout_line_item')
    .select('payout_run_id')
    .in('payout_run_id', runIds.length ? runIds : ['']);

  const linesPerRun = new Map<string, number>();
  for (const line of lines ?? []) {
    linesPerRun.set(line.payout_run_id, (linesPerRun.get(line.payout_run_id) ?? 0) + 1);
  }

  // What can go out today, which is what this screen is for. The predicate is
  // in core so the list below and the sentence above cannot disagree.
  const rowsPayable = payable ?? [];
  const ready = rowsPayable.filter((row) => isPayableNow(row.gate));
  const readyTotal = ready.reduce((sum, row) => sum + Number(row.amount_minor_units), 0);
  const auditorCount = new Set(ready.map((row) => row.auditor_name)).size;

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86_400_000);
  const asDate = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <AdminChrome who={session.fullName} queuePosition={`${(payable ?? []).length} OWED`}>
      <div style={{ ...adminPage, maxWidth: 880 }}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Payouts</h1>
          <span style={metaLabel}>Paid on QA, never on client approval</span>
        </div>

        <Lede
          {...payoutsLede({
            readyCount: ready.length,
            readyMinorUnits: readyTotal,
            auditorCount,
            heldCount: rowsPayable.length - ready.length,
            currency: DEFAULT_CURRENCY,
          })}
        />

        <PayableList
          payable={(payable ?? []).map((row) => ({
            auditId: row.audit_id,
            reference: row.reference,
            auditorName: row.auditor_name,
            amountMinorUnits: Number(row.amount_minor_units),
            gate: row.gate,
          }))}
        />

        <BuildRun defaultStart={asDate(monthAgo)} defaultEnd={asDate(today)} />

        <RunList
          runs={(runs ?? []).map((run) => ({
            id: run.id,
            reference: run.reference,
            periodStart: run.period_start,
            periodEnd: run.period_end,
            status: run.status,
            totalMinorUnits: Number(run.total_minor_units),
            lineCount: linesPerRun.get(run.id) ?? 0,
            externalReference: run.external_reference,
          }))}
          actions={(run) => <RunActions runId={run.id} status={run.status} />}
        />
      </div>
    </AdminChrome>
  );
}
