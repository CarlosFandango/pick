import { z } from 'zod';
import { AUDIT_MOMENTS, COMPLIANCE_CATEGORIES } from './moments.js';

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
export const checkOutcome = z.enum(['pass', 'fail', 'not_applicable', 'not_observed']);
export const observationKind = z.enum(['note', 'timing', 'count', 'incident']);
export const evidenceKind = z.enum(['photo', 'audio', 'video', 'document']);
export const payoutExecutionMethod = z.enum(['manual_csv', 'bank_api', 'stripe_connect']);

export const auditStatus = z.enum([
  'draft',
  'requested',
  'matched',
  'scheduled',
  'in_progress',
  'submitted',
  'under_review',
  'completed',
  'cancelled',
]);

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
