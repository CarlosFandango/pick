import { z } from 'zod';
import { AUDIT_MOMENTS, COMPLIANCE_CATEGORIES } from './moments';

export const uuid = z.string().uuid();

/** UK postcode, tolerant of a missing or extra inner space. */
export const postcode = z
  .string()
  .trim()
  .regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i, 'Not a valid UK postcode');

/** Outward-code letters. What v1 matches auditors on. */
export function postcodeArea(value: string): string {
  return (value.replace(/\s+/g, '').match(/^[A-Za-z]{1,2}/)?.[0] ?? '').toUpperCase();
}

export const appRole = z.enum(['auditor', 'client', 'pick_admin']);
export const residencyZone = z.enum(['uk', 'eea', 'other']);
export const orgType = z.enum(['charity', 'contractor', 'pick']);
export const auditMoment = z.enum(AUDIT_MOMENTS);
export const complianceCategory = z.enum(COMPLIANCE_CATEGORIES);
/**
 * PASS | FAIL | NOTE, per design/BUILD-GUIDE.md. Never "OBS".
 *
 * NOTE is an observation the auditor wants on the record without calling it a
 * breach — the benefit-of-the-doubt position. It does not score.
 *
 * `not_applicable` and `not_observed` remain in the database type because
 * Postgres cannot drop an enum value; nothing writes them.
 */
export const checkOutcome = z.enum(['pass', 'fail', 'note']);
export const observationKind = z.enum(['note', 'timing', 'count', 'incident']);

/** The four methodologies. Each implies a different checklist variant. */
export const auditType = z.enum(['street', 'door_to_door', 'private_site', 'lottery']);

/** What the fundraisers take on the shift — sets the checklist variant. */
export const shiftPaymentMethod = z.enum(['direct_debit', 'contactless']);

export const AUDIT_TYPE_LABELS: Record<z.infer<typeof auditType>, string> = {
  street: 'Street',
  door_to_door: 'Door-to-door',
  private_site: 'Private site',
  lottery: 'Lottery',
};

export const SHIFT_PAYMENT_LABELS: Record<z.infer<typeof shiftPaymentMethod>, string> = {
  direct_debit: 'Direct debit',
  contactless: 'Contactless / one-off',
};

/** The window a client may book. Never a single date — see BUILD-GUIDE.md. */
export const MINIMUM_WINDOW_DAYS = 3;

/**
 * How far ahead a window must start.
 *
 * Long enough that assigning an auditor cannot reveal which day the team is
 * being watched: a window opening tomorrow is effectively a date.
 */
export const BOOKING_LEAD_DAYS = 5;

/** The earliest window start a client may choose, as a yyyy-mm-dd string. */
export function earliestWindowStart(today: Date): string {
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() + BOOKING_LEAD_DAYS);
  return earliest.toISOString().slice(0, 10);
}
export const evidenceKind = z.enum(['photo', 'audio', 'video', 'document']);
export const payoutExecutionMethod = z.enum(['manual_csv', 'bank_api', 'stripe_connect']);

/** booked → assigned → in_progress → in_review → released, per the design. */
export const auditStatus = z.enum([
  'draft',
  'booked',
  'assigned',
  'in_progress',
  'in_review',
  'released',
  // Not a failure: the auditor is paid in full and the credit is returned.
  'no_team_present',
  'cancelled',
]);

/** The order the pipeline rail renders in. Excludes the branches. */
export const AUDIT_PIPELINE = [
  'booked',
  'assigned',
  'in_progress',
  'in_review',
  'released',
] as const;

export type AuditPipelineStage = (typeof AUDIT_PIPELINE)[number];

export const checkDefinition = z.object({
  id: uuid,
  code: z.string(),
  version: z.number().int().positive(),
  moment: auditMoment,
  compliance_category: complianceCategory,
  prompt: z.string(),
  guidance: z.string().nullable().default(null),
  weight: z.number().int().positive(),
  is_critical: z.boolean(),
  sort_order: z.number().int(),
});

/**
 * Every field event carries both clocks. `occurred_at` is the device: it is what
 * actually happened, and it is what orders corrections. `recorded_at` is ours.
 * They are never reconciled into one column.
 */
const fieldEvent = z.object({
  id: uuid,
  audit_id: uuid,
  auditor_id: uuid,
  occurred_at: z.string().datetime({ offset: true }),
});

export const checkResult = fieldEvent.extend({
  check_definition_id: uuid,
  outcome: checkOutcome,
  note: z.string().nullable().default(null),
});

export const observationLog = fieldEvent.extend({
  kind: observationKind.default('note'),
  moment: auditMoment.nullable().default(null),
  body: z.string().nullable().default(null),
  payload: z.record(z.string(), z.unknown()).default({}),
});

/** A pointer. Capture and playback are deliberately absent. */
export const evidenceAttachment = z.object({
  id: uuid,
  audit_id: uuid,
  observation_log_id: uuid.nullable().default(null),
  kind: evidenceKind,
  storage_bucket: z.string(),
  storage_path: z.string(),
  mime_type: z.string().nullable().default(null),
  byte_size: z.number().int().nonnegative().nullable().default(null),
  duration_seconds: z.number().int().nonnegative().nullable().default(null),
  sha256: z.string().nullable().default(null),
  captured_at: z.string().datetime({ offset: true }).nullable().default(null),
});

export type CheckDefinition = z.infer<typeof checkDefinition>;
export type CheckResult = z.infer<typeof checkResult>;
export type ObservationLog = z.infer<typeof observationLog>;
export type EvidenceAttachment = z.infer<typeof evidenceAttachment>;
export type CheckOutcome = z.infer<typeof checkOutcome>;
export type AuditStatus = z.infer<typeof auditStatus>;
export type AppRole = z.infer<typeof appRole>;
