'use server';

import { routeFor } from '@picksel/core';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

const form = z.object({
  subject: z.enum(['about_audit', 'about_fundraiser']),
  auditId: z.string().uuid().optional(),
  body: z.string().trim().min(1, 'Say what happened.'),
});

export interface ComplaintState {
  error?: string;
  raised?: boolean;
}

export async function raiseComplaint(
  _prev: ComplaintState,
  data: FormData,
): Promise<ComplaintState> {
  const session = await requireRole('client', 'pick_admin');
  if (!session.organisationId) return { error: 'Your account is not linked to a charity.' };

  const parsed = form.safeParse({
    subject: data.get('subject'),
    auditId: data.get('auditId') || undefined,
    body: data.get('body'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the details and try again.' };
  }

  // A complaint about an audit has to say which audit — the database enforces
  // it too, but saying so here gives a sentence rather than a constraint name.
  if (routeFor(parsed.data.subject).requiresAudit && !parsed.data.auditId) {
    return { error: 'Choose which audit this is about.' };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('complaint').insert({
    organisation_id: session.organisationId,
    audit_id: parsed.data.auditId ?? null,
    subject: parsed.data.subject,
    body: parsed.data.body,
    raised_by: session.userId,
  });

  if (error) return { error: error.message };
  return { raised: true };
}
