import type { AuditMoment } from './moments';
import { AUDIT_MOMENTS, MOMENT_LABELS } from './moments';

/**
 * The one thing a person came to find out, in a sentence — the LEDE.
 *
 * Named for journalism's word rather than "verdict", which this codebase
 * already uses for a single check's pass/fail/note. The design pattern is
 * still called verdict-first; the thing it puts first is this.
 *
 * Every screen in the design opens with this and then lets the reader go down
 * for the evidence. That only works if the sentence is derived once, in the
 * domain, from the same rules the score uses — a screen that composes its own
 * headline is a screen that will disagree with the next one.
 *
 * The verdict is not the score. `scoreAudit` answers "how much of the weight
 * was earned"; this answers "what do I tell them". A charity is never told a
 * percentage first, because 89.7% is unsituatable by anyone who does not see
 * a hundred of these a year.
 */
export type LedeTone = 'breach' | 'clear' | 'waiting' | 'attention';

export interface Lede {
  tone: LedeTone;
  /** A short label above the headline: "2 breaches · action needed". */
  meta: string;
  /** The answer, as a sentence a person would say. Never a number. */
  headline: string;
  /** One or two sentences of support. May be empty. */
  detail: string;
}

/**
 * What a charity is told a check found.
 *
 * `client_finding` is written for this; the auditor-facing `prompt` is the
 * fallback so a check added without prose still renders something true.
 */
export interface ReportableFinding {
  code: string;
  moment: AuditMoment;
  finding: string;
  rationale: string;
  isCritical: boolean;
}

/** "Opening and Ask", "Opening, Pitch and Ask" — a list a person would say. */
export function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * Join clauses into one sentence.
 *
 * Like `joinWords`, except that a clause with its own comma in it needs an
 * Oxford comma before the "and" or the sentence reads as a longer list:
 * "did not say they were paid, or name the agency and kept asking" parses
 * wrongly on the first attempt, every time.
 */
function joinClauses(clauses: readonly string[]): string {
  if (clauses.length <= 1) return clauses[0] ?? '';
  const separator = clauses.some((c) => c.includes(',')) ? ', and ' : ' and ';
  return `${clauses.slice(0, -1).join(', ')}${separator}${clauses[clauses.length - 1]}`;
}

/** "1 breach", "3 breaches" — the counted noun, without inventing a total. */
function count(n: number, singular: string, plural = `${singular}es`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Lower-case the first letter of a finding so it can be joined into a
 * sentence. Findings are stored as bare predicates ("Did not say they were
 * paid…") with the fundraiser as the implied subject, which is what lets two
 * of them become one sentence here and stand alone in a card.
 */
function asClause(finding: string): string {
  const trimmed = finding.replace(/\.$/, '');
  // Leave an initialism or a proper noun alone — "The Direct Debit Guarantee".
  if (/^[A-Z]{2,}/.test(trimmed)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

/**
 * The verdict on a released audit, for the charity that paid for it.
 *
 * Breaches lead, because they are the reason to read. Where there are one or
 * two, they are named in the headline itself — a director should not have to
 * scroll to learn what happened. Beyond two, naming them all makes a sentence
 * nobody finishes, so the headline counts them and says where they were.
 */
export function reportLede(failures: readonly ReportableFinding[], totalChecked: number): Lede {
  const critical = failures.filter((f) => f.isCritical);
  const inOrder = totalChecked - failures.length;

  if (failures.length === 0) {
    return {
      tone: 'clear',
      meta: 'Nothing to act on',
      headline: 'Everything we checked was in order.',
      detail:
        totalChecked > 0
          ? `All ${totalChecked} checks passed. Keep this — it is evidence you monitor your fundraising.`
          : '',
    };
  }

  // In the order the encounter ran, not the order the rows came back. A
  // sentence that says "kept asking after a refusal, and did not say they were
  // paid" describes the shift backwards.
  const naming = inEncounterOrder(critical.length > 0 ? critical : failures);
  const tone: LedeTone = critical.length > 0 ? 'breach' : 'attention';
  const [noun, nouns] = critical.length > 0 ? ['breach', 'breaches'] : ['issue', 'issues'];
  const meta =
    critical.length > 0
      ? `${count(critical.length, 'breach')} · action needed`
      : `${count(failures.length, 'issue', 'issues')} · worth a look`;

  const headline =
    naming.length <= 2
      ? `${capitalise(joinClauses(naming.map((f) => asClause(f.finding))))}.`
      : `${count(naming.length, noun, nouns)} in ${joinWords(
          momentsOf(naming).map((m) => MOMENT_LABELS[m]),
        )}.`;

  const detail = [
    critical.length > 0
      ? 'These are the kind of thing the Fundraising Regulator upholds complaints on.'
      : '',
    inOrder > 0 ? `The other ${inOrder} things we checked were in order.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return { tone, meta, headline, detail };
}

function capitalise(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Findings, in the order the encounter runs through them. */
export function inEncounterOrder(findings: readonly ReportableFinding[]): ReportableFinding[] {
  return [...findings].sort(
    (a, b) => AUDIT_MOMENTS.indexOf(a.moment) - AUDIT_MOMENTS.indexOf(b.moment),
  );
}

/** The moments those findings fall in, in the order the encounter runs. */
export function momentsOf(findings: readonly ReportableFinding[]): AuditMoment[] {
  const present = new Set(findings.map((f) => f.moment));
  return AUDIT_MOMENTS.filter((m) => present.has(m));
}

/**
 * The verdict on an audit that has no report yet.
 *
 * The charity's question here is not "what did it find" but "is anything
 * expected of me" — and the answer is almost always no. Saying so plainly is
 * the whole job of the screen; a status enum rendered as a chip is not an
 * answer.
 */
export function waitingLede(input: {
  status: string;
  windowStartOn?: string | null;
  windowEndOn?: string | null;
  hasAuditor: boolean;
}): Lede {
  const { status, hasAuditor } = input;

  if (status === 'cancelled') {
    return {
      tone: 'attention',
      meta: 'Cancelled',
      headline: 'This audit was cancelled.',
      detail: 'Your credit was returned to your balance.',
    };
  }

  if (status === 'no_team_present') {
    return {
      tone: 'attention',
      meta: 'Nobody was there',
      headline: 'Our auditor attended and found no fundraising team.',
      detail:
        'That is worth knowing — it usually means a shift was not worked. Your credit was returned.',
    };
  }

  if (status === 'submitted' || status === 'in_review') {
    return {
      tone: 'waiting',
      meta: 'With PICK',
      headline: 'The audit is done and we are checking the write-up.',
      detail: 'We read every report before you see it. Nothing is needed from you.',
    };
  }

  if (status === 'in_progress') {
    return {
      tone: 'waiting',
      meta: 'Happening now',
      headline: 'Our auditor is at the site.',
      detail: 'Nothing is needed from you.',
    };
  }

  if (!hasAuditor) {
    return {
      tone: 'waiting',
      meta: 'Finding an auditor',
      headline: 'We are matching this to an auditor who covers the area.',
      detail: 'Nothing is needed from you. We will tell you when it is booked in.',
    };
  }

  return {
    tone: 'waiting',
    meta: 'Booked in',
    headline: 'An auditor is assigned and will attend during your window.',
    detail: 'Nothing is needed from you.',
  };
}

/**
 * The encounter, broken into the moments it ran through.
 *
 * The report's second half is a timeline, and a timeline needs every moment
 * that was checked — including the ones where nothing went wrong, because
 * "4 of 4 in order" is what makes the one red step mean something. A list of
 * only the failures reads as a charge sheet.
 */
export interface MomentSummary {
  moment: AuditMoment;
  label: string;
  /** 1-based, so a screen can print "03 Opening" without knowing the order. */
  position: number;
  checked: number;
  inOrder: number;
  findings: ReportableFinding[];
}

export function encounterSequence(
  checkedByMoment: ReadonlyMap<AuditMoment, number>,
  failures: readonly ReportableFinding[],
): MomentSummary[] {
  return AUDIT_MOMENTS.flatMap((moment, index) => {
    const checked = checkedByMoment.get(moment) ?? 0;
    if (checked === 0) return [];
    const findings = failures.filter((f) => f.moment === moment);
    return [
      {
        moment,
        label: MOMENT_LABELS[moment],
        position: index + 1,
        checked,
        inOrder: checked - findings.length,
        findings,
      },
    ];
  });
}
