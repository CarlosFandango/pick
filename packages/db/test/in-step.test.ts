import {
  AUDIT_MOMENTS,
  appRole,
  auditStatus,
  auditType,
  BOOKING_LEAD_DAYS,
  COMPLAINT_ROUTES,
  COMPLIANCE_CATEGORIES,
  CREDIT_REASON_LABELS,
  checkOutcome,
  evidenceKind,
  MINIMUM_WINDOW_DAYS,
  OPS_PRESENTATION,
  observationKind,
  orgType,
  payoutExecutionMethod,
  residencyZone,
  shiftPaymentMethod,
} from '@picksel/core';
import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * The facts that exist twice, checked against each other.
 *
 * PATTERNS says a closed set of values is an `as const` array in core plus a PG
 * enum, "kept in step" — and until this file, keeping them in step was a person
 * remembering. Same for the domain constants: the booking form sets its `min`
 * dates from the core numbers and the database refuses the booking using its
 * own, so changing one alone means the form silently offers dates the server
 * rejects and the client is shown a raw Postgres error.
 *
 * Neither duplication is wrong. The form cannot await a round trip to know what
 * dates to allow, and a PG enum is what makes the column self-describing. What
 * was missing is the thing that fails when they disagree.
 */

const labels = async (
  db: Parameters<Parameters<typeof withDatabase>[0]>[0],
  enumName: string,
): Promise<string[]> => {
  const rows = await db.arrange<{ label: string }>(
    `select e.enumlabel as label
     from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = $1
     order by e.enumsortorder`,
    [enumName],
  );
  return rows.map((r) => r.label);
};

describe('enumerated sets are the same in core and in the schema', () => {
  it.each([
    ['audit_moment', AUDIT_MOMENTS],
    ['compliance_category', COMPLIANCE_CATEGORIES],
    ['app_role', appRole.options],
    ['residency_zone', residencyZone.options],
    ['org_type', orgType.options],
    ['audit_type', auditType.options],
    ['shift_payment_method', shiftPaymentMethod.options],
    ['observation_kind', observationKind.options],
    ['evidence_kind', evidenceKind.options],
    ['payout_execution_method', payoutExecutionMethod.options],
    // Not zod enums, but still a closed set core enumerates at runtime — the
    // Record keys are what a screen iterates, so they are what must match.
    ['credit_reason', Object.keys(CREDIT_REASON_LABELS)],
    ['ops_item_kind', Object.keys(OPS_PRESENTATION)],
    ['complaint_subject', COMPLAINT_ROUTES.map((r) => r.subject)],
  ])('%s', async (enumName, expected) => {
    await withDatabase(async (db) => {
      // Order matters for audit_moment — it is the sequence of a doorstep
      // interaction, and scoring, prep and write-up all walk it. Comparing
      // ordered lists everywhere costs nothing and catches a reordering that
      // would silently change what `momentOrder` means.
      expect(await labels(db, enumName)).toEqual([...expected]);
    });
  });

  it('audit_status carries two values the design retired, and no more', async () => {
    await withDatabase(async (db) => {
      // Postgres cannot drop an enum value, so `scheduled` and `submitted`
      // survive in the type. A CHECK constraint forbids writing them and
      // parseAuditStatus throws on reading one. Anything else appearing here is
      // a value core does not know about.
      const inSchema = await labels(db, 'audit_status');
      expect(inSchema.filter((v) => !auditStatus.options.includes(v as never))).toEqual([
        'scheduled',
        'submitted',
      ]);
      for (const status of auditStatus.options) expect(inSchema).toContain(status);
    });
  });

  it('check_outcome carries two the design retired, and no more', async () => {
    await withDatabase(async (db) => {
      const inSchema = await labels(db, 'check_outcome');
      expect(inSchema.filter((v) => !checkOutcome.options.includes(v as never))).toEqual([
        'not_applicable',
        'not_observed',
      ]);
      for (const outcome of checkOutcome.options) expect(inSchema).toContain(outcome);
    });
  });

  it('leaves no enum in the schema that core has never heard of', async () => {
    await withDatabase(async (db) => {
      // Everything above is asserted against core. These are the rest: sets
      // core describes as a TypeScript union with no runtime value to compare
      // (flag_severity, assignment_outcome, eligibility_flag) or that only the
      // schema uses. Listing them keeps the set closed, so a new enum is a
      // decision rather than something a screen discovers later by rendering a
      // value it cannot label.
      const known = [
        'app_role',
        'assignment_outcome',
        'audit_moment',
        'audit_status',
        'audit_type',
        'auditor_approval_status',
        'check_outcome',
        'complaint_status',
        'complaint_subject',
        'compliance_category',
        'credit_reason',
        'eligibility_flag',
        'evidence_kind',
        'flag_severity',
        'observation_kind',
        'ops_item_kind',
        'org_type',
        'payout_execution_method',
        'payout_line_status',
        'payout_run_status',
        'residency_zone',
        'shift_payment_method',
        'user_status',
      ];
      const rows = await db.arrange<{ typname: string }>(
        `select t.typname
         from pg_type t
         join pg_namespace n on n.oid = t.typnamespace
         where n.nspname = 'public' and t.typtype = 'e'
         order by 1`,
      );
      expect(rows.map((r) => r.typname).filter((t) => !known.includes(t))).toEqual([]);
    });
  });
});

describe('domain constants are the same in core and in the schema', () => {
  it('booking lead time', async () => {
    await withDatabase(async (db) => {
      const [row] = await db.arrange<{ days: number }>('select public.booking_lead_days() as days');
      expect(Number(row?.days)).toBe(BOOKING_LEAD_DAYS);
    });
  });

  it('minimum booking window', async () => {
    await withDatabase(async (db) => {
      // Asserted by booking, not by comparing literals: the booking form offers
      // a window of MINIMUM_WINDOW_DAYS and the database is what refuses it, so
      // the property worth pinning is that the shortest window the form allows
      // is one the database accepts, and one day shorter is not.
      const sql = 'select * from book_audit($1, $2, $3, $4, $5, $6, null, null, false)';
      const start = `current_date + ${BOOKING_LEAD_DAYS}`;

      const shortest = await db
        .as(ids.clientA)
        .query<{ status: string }>(
          sql.replace('$5', start).replace('$6', `${start} + ${MINIMUM_WINDOW_DAYS - 1}`),
          [ids.charityA, 'street', 'direct_debit', 'SW1A 1AA'],
        );
      expect(shortest[0]?.status).toBe('booked');

      const tooShort = await db
        .as(ids.clientA)
        .expectRefused(
          sql.replace('$5', start).replace('$6', `${start} + ${MINIMUM_WINDOW_DAYS - 2}`),
          [ids.charityA, 'street', 'direct_debit', 'SW1A 1AA'],
        );
      expect(tooShort).toMatch(/at least three days/i);
    });
  });

  it('refuses a window that starts inside the lead time the form advertises', async () => {
    await withDatabase(async (db) => {
      // The form sets its `min` from BOOKING_LEAD_DAYS. If the database ever
      // wanted more than that, the form would offer dates the server rejects
      // and the client would be shown a raw Postgres error.
      const sql = 'select * from book_audit($1, $2, $3, $4, $5, $6, null, null, false)';
      const start = `current_date + ${BOOKING_LEAD_DAYS - 1}`;

      const message = await db
        .as(ids.clientA)
        .expectRefused(sql.replace('$5', start).replace('$6', `${start} + 4`), [
          ids.charityA,
          'street',
          'direct_debit',
          'SW1A 1AA',
        ]);
      expect(message).toMatch(/must start at least/i);
    });
  });

  it('one window for exposure and for the familiarity warning', async () => {
    await withDatabase(async (db) => {
      // The S3.2 picker used to warn on a hardcoded 60 while assignment
      // excluded on 90. Same idea, two answers, depending which screen asked.
      const [row] = await db.arrange<{ src: string }>(
        `select pg_get_functiondef(p.oid) as src
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'selectable_auditors'`,
      );
      expect(row?.src).toContain('exposure_window_days()');
      expect(row?.src).not.toMatch(/current_date - \d+/);
    });
  });
});
