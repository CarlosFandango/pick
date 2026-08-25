export type ComplaintSubject = 'about_audit' | 'about_fundraiser';

export interface ComplaintRoute {
  subject: ComplaintSubject;
  title: string;
  description: string;
  /** What happens next, said before they write anything. */
  outcome: string;
  /** Whether the form must name an audit. */
  requiresAudit: boolean;
}

/**
 * The fork, stated in the client's terms.
 *
 * A charity arriving with a problem does not know whose problem it is. The
 * screen's job is to sort that out before they type, because the two paths go
 * to different people and burying one in the other is the failure mode.
 */
export const COMPLAINT_ROUTES: ComplaintRoute[] = [
  {
    subject: 'about_audit',
    title: 'Something in the audit is wrong',
    description:
      'A finding you disagree with, a report that misreads the shift, or an auditor who got something factually wrong.',
    outcome:
      'PICK reviews the audit and comes back to you. The report can be corrected or withdrawn.',
    requiresAudit: true,
  },
  {
    subject: 'about_fundraiser',
    title: 'Something a fundraiser did is wrong',
    description:
      'Conduct on the shift itself — pressure, a safeguarding concern, or anything that may need reporting onward.',
    outcome:
      'PICK records it and passes it to you and, where required, to the regulator. We are not the complaints body for your fundraisers.',
    requiresAudit: false,
  },
];

export function routeFor(subject: ComplaintSubject): ComplaintRoute {
  const route = COMPLAINT_ROUTES.find((r) => r.subject === subject);
  if (!route) throw new Error(`Unknown complaint subject: ${subject}`);
  return route;
}
