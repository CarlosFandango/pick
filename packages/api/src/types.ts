import type { Database } from '@picksel/db';

export type Tables = Database['public']['Tables'];
export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type Insert<T extends keyof Tables> = Tables[T]['Insert'];

export type Organisation = Row<'organisation'>;
export type UserProfile = Row<'user_profile'>;
export type AuditorProfile = Row<'auditor_profile'>;
export type Audit = Row<'audit'>;
export type CheckDefinitionRow = Row<'check_definition'>;
export type CheckResultRow = Row<'check_result'>;
export type ObservationLogRow = Row<'observation_log'>;
export type EvidenceAttachmentRow = Row<'evidence_attachment'>;
export type CreditTransactionRow = Row<'credit_transaction'>;
export type PayoutRunRow = Row<'payout_run'>;
export type PayoutLineItemRow = Row<'payout_line_item'>;

export type { Database };
