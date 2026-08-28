import type { AppRole } from '@picksel/core';

/**
 * Where a role belongs when it has not asked for anywhere in particular.
 *
 * One definition, used by three callers that were each deciding separately:
 * the root page, the sign-in action, and `requireRole` bouncing someone out of
 * a screen that is not theirs. They disagreed — sign-in sent everyone to
 * `/book`, which is a client screen, so an admin signing in was redirected
 * straight back out of it and onto a holding page.
 *
 * An auditor's work is in the field app, not here. The portal has exactly one
 * thing for them — accepting an invitation — so that is where they go, and
 * `/welcome` forwards them on if they have already done it.
 */
export function homeFor(role: AppRole): string {
  switch (role) {
    case 'pick_admin':
      return '/admin';
    case 'client':
      return '/audits';
    case 'auditor':
      return '/welcome';
  }
}
