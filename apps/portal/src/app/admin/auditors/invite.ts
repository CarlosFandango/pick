'use server';

import { createAdminClient } from '@picksel/api/server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';

export interface InviteState {
  error?: string;
  /** Rendered once, for the admin to copy. Never stored. */
  link?: string;
  email?: string;
}

/**
 * Invite someone onto the auditor network.
 *
 * The one place in the portal that legitimately needs `createAdminClient()`:
 * creating an `auth.users` row is not something any signed-in role can do, and
 * there is no policy that could make it so. The rule this enforces — only PICK
 * invites — therefore lives here rather than in the database, which is why it
 * is a server action with a `requireRole` on the first line.
 *
 * No email is sent. `generateLink` returns a URL and the admin passes it on
 * however they already talk to that person, which is by hand at this volume
 * (Jaz is recruiting regionally, one conversation at a time). Wiring SMTP
 * later changes this function and nothing else.
 *
 * The invited person lands as `user_profile.status = 'invited'` and
 * `auditor_profile.approval_status = 'pending'`. They are not on the roster in
 * any meaningful sense until they accept, and not offerable until PICK
 * approves them — two separate decisions, neither of which is theirs.
 */
export async function inviteAuditor(_previous: InviteState, form: FormData): Promise<InviteState> {
  const session = await requireRole('pick_admin');

  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!email.includes('@')) return { error: 'That does not look like an email address.' };

  // An invitation link is absolute, so a missing origin does not degrade — it
  // produces a link that sends a new auditor somewhere that is not us, and the
  // only person who finds out is the person who cannot get in. Refuse to make
  // one rather than hand over a broken one.
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    return { error: 'NEXT_PUBLIC_SITE_URL is not set, so the invitation link would go nowhere.' };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.user) {
    // Distinguishing "already exists" is safe here — this screen is behind
    // pick_admin, so there is no account-enumeration risk to a stranger.
    return {
      error: /already/i.test(error?.message ?? '')
        ? 'Somebody with that address already has an account.'
        : (error?.message ?? 'Could not create the invitation.'),
    };
  }

  const userId = data.user.id;

  const { error: profileFailed } = await admin.from('user_profile').insert({
    id: userId,
    role: 'auditor',
    // They choose their own name when they accept. Empty rather than a
    // placeholder, so nothing invented ever reaches the roster.
    full_name: '',
    email,
    status: 'invited',
    invited_by: session.userId,
  });

  if (profileFailed) return { error: profileFailed.message };

  const { error: auditorFailed } = await admin
    .from('auditor_profile')
    .insert({ user_id: userId, approval_status: 'pending' });

  if (auditorFailed) return { error: auditorFailed.message };

  revalidatePath('/admin/auditors');
  return { link: data.properties.action_link, email };
}
