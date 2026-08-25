/** How long an auditor has left, in the design's register: "EXPIRES IN 46H". */
export function expiresIn(expiresAt: Date, now: Date): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 'EXPIRED';

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `EXPIRES IN ${hours}H`;

  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `EXPIRES IN ${minutes}M`;
}

/**
 * The offer shows an area, never an address.
 *
 * An auditor who declines must not learn where the team will be, so this takes
 * the outward code and an optional locality — never `pitch_detail`, which the
 * database does not release until the audit is accepted.
 */
export function offerArea(postcodeOutward: string, locality?: string | null): string {
  return locality ? `${postcodeOutward} — ${locality}` : postcodeOutward;
}

/** "Tue 3 – Thu 5 March" */
export function windowLabel(start: Date, end: Date): string {
  const day = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).replace(',', '');
  const month = end.toLocaleDateString('en-GB', { month: 'long' });
  return `${day(start)} – ${day(end)} ${month}`;
}
