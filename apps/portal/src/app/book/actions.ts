'use server';

import { auditType, isEnabled, postcode, shiftPaymentMethod } from '@picksel/core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

const bookingForm = z.object({
  auditType,
  shiftPaymentMethod,
  postcode,
  windowStartOn: z.string().date(),
  windowEndOn: z.string().date(),
  siteName: z.string().trim().max(200).optional(),
  requiresAv: z.coerce.boolean().default(false),
});

export interface BookingState {
  error?: string;
}

/**
 * S1.1 — book an audit.
 *
 * Runs as the signed-in user, not the service role: `book_audit` checks the
 * caller's organisation itself, and the balance check and both writes happen
 * inside one database transaction. Doing it here instead would mean an audit
 * could exist with no credit spent, or a credit spent with no audit.
 */
export async function bookAudit(_previous: BookingState, form: FormData): Promise<BookingState> {
  const session = await requireRole('client', 'pick_admin');
  if (!session.organisationId) return { error: 'Your account is not linked to a charity.' };

  const parsed = bookingForm.safeParse({
    auditType: form.get('auditType'),
    shiftPaymentMethod: form.get('shiftPaymentMethod'),
    postcode: form.get('postcode'),
    windowStartOn: form.get('windowStartOn'),
    windowEndOn: form.get('windowEndOn'),
    siteName: form.get('siteName') || undefined,
    // Hiding the control is presentation; this is the rule. A form post is not
    // a form — anyone can send this field, and an audit flagged for A/V that
    // nothing can fulfil would sit unmatched with a credit already spent.
    requiresAv: isEnabled('avEvidence') && form.get('requiresAv') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the details and try again.' };
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('book_audit', {
    p_organisation_id: session.organisationId,
    p_audit_type: parsed.data.auditType,
    p_shift_payment_method: parsed.data.shiftPaymentMethod,
    p_postcode: parsed.data.postcode,
    p_window_start_on: parsed.data.windowStartOn,
    p_window_end_on: parsed.data.windowEndOn,
    p_site_name: parsed.data.siteName,
    p_requires_av: parsed.data.requiresAv,
  });

  // The database is the authority on these rules, so its message is the one
  // worth showing rather than a guess made before calling it.
  if (error) return { error: error.message };

  revalidatePath('/audits');
  redirect(`/audits?booked=${Array.isArray(data) ? data[0]?.reference : data?.reference}`);
}
