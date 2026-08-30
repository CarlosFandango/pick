import { z } from 'zod';
import { AUDIT_MOMENTS, COMPLIANCE_CATEGORIES } from './moments';

export const uuid = z.string().uuid();

/**
 * The address of a shift, as the country writes it.
 *
 * Deliberately not validated against a UK postcode any more: that regex made
 * the product structurally UK-only, rejecting a Dublin address on insert. What
 * matching needs is the place; this only has to be legible to the auditor who
 * navigates by it.
 */
export const address = z.string().trim().min(3, 'Where is your agency working?');

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

/**
 * What each kind of fundraising actually is.
 *
 * A fundraising director knows their own programme; they do not necessarily
 * know which of our four words it falls under, and picking the wrong one sends
 * an auditor to the wrong sort of shift.
 */
export const AUDIT_TYPE_DESCRIPTIONS: Record<z.infer<typeof auditType>, string> = {
  street: 'Public pavement, on a pitch',
  door_to_door: 'Residential streets',
  private_site: 'Shopping centre, station, supermarket',
  lottery: 'Weekly draw sign-ups',
};

export const SHIFT_PAYMENT_LABELS: Record<z.infer<typeof shiftPaymentMethod>, string> = {
  direct_debit: 'Direct debit',
  contactless: 'Contactless / one-off',
};

/** How the public are asked to give, which changes what an auditor watches. */
export const SHIFT_PAYMENT_DESCRIPTIONS: Record<z.infer<typeof shiftPaymentMethod>, string> = {
  direct_debit: 'Regular gift, signed up on a tablet',
  contactless: 'A single tap, no sign-up',
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

/**
 * Narrow a status read from the database.
 *
 * The Postgres enum still carries `scheduled` and `submitted` — values this
 * schema invented before the design drop existed. Postgres cannot drop an enum
 * value, so a CHECK constraint forbids writing them instead, and the generated
 * types cannot know that.
 *
 * This is where the guarantee is stated in TypeScript. It throws rather than
 * defaulting: seeing one of those values would mean the CHECK constraint had
 * been dropped, which is worth finding out about loudly.
 */
export function parseAuditStatus(value: string): AuditStatus {
  const parsed = auditStatus.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error(
    `Unexpected audit status "${value}". The status_in_pipeline check should make this impossible.`,
  );
}

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

/**
 * What an auditor tells us when they accept an invitation.
 *
 * Coverage is postcode **area** letters only — matching joins on them, so a
 * district here would match nothing and the auditor would simply never be
 * offered work. Uppercased on the way in, because the column is uppercase and
 * a lowercase entry would silently fail to match.
 *
 * The same shape a public sign-up route would submit, which is why it lives
 * here rather than in the portal.
 */
export const travelMode = z.enum(['public_transport', 'own_vehicle', 'either']);

/**
 * How an auditor gets to a shift, in the auditor's own voice.
 *
 * These sit on a form somebody fills in about themselves, so "I drive" is
 * right there and wrong everywhere else — PICK reading a roster is reading
 * about a third person, and "45 min · i drive" is what you get from
 * lower-casing the first person into a sentence.
 */
export const TRAVEL_MODE_LABELS: Record<z.infer<typeof travelMode>, string> = {
  public_transport: 'Public transport',
  own_vehicle: 'I drive',
  either: 'Either',
};

/** The same three, said about somebody else. For PICK's screens. */
export const TRAVEL_MODE_THIRD_PERSON: Record<z.infer<typeof travelMode>, string> = {
  public_transport: 'public transport',
  own_vehicle: 'own vehicle',
  either: 'either',
};

export const auditorApplication = z.object({
  full_name: z.string().trim().min(1, 'We need a name to put on the roster'),
  base_place_id: z.string().uuid('Where do you set out from?'),
  max_travel_minutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(240, 'That is further than anybody travels for one audit'),
  travel_mode: travelMode,
  place_ids: z
    .array(z.string().uuid())
    .min(1, 'An auditor works somewhere — pick at least one place'),
  audit_types: z.array(auditType).min(1, 'An auditor runs at least one kind of audit'),
  av_capable: z.boolean().default(false),
});

export type AuditorApplication = z.infer<typeof auditorApplication>;
export type TravelMode = z.infer<typeof travelMode>;

export type CheckDefinition = z.infer<typeof checkDefinition>;
export type CheckResult = z.infer<typeof checkResult>;
export type ObservationLog = z.infer<typeof observationLog>;
export type EvidenceAttachment = z.infer<typeof evidenceAttachment>;
export type CheckOutcome = z.infer<typeof checkOutcome>;
export type AuditStatus = z.infer<typeof auditStatus>;
export type AppRole = z.infer<typeof appRole>;
