import { AUDIT_PIPELINE, type AuditPipelineStage, type AuditStatus } from './entities';
import { CLIENT_STATUS } from './status';

export interface PipelineStep {
  stage: AuditPipelineStage;
  label: string;
  state: 'done' | 'current' | 'upcoming';
}

/**
 * The rail a client watches an audit move along.
 *
 * Branches do not get their own rail. An audit that found nobody there, or was
 * cancelled, left the line — showing it half-way along a track it is no longer
 * on would be a lie about where it is.
 */
export function pipelineSteps(status: AuditStatus): PipelineStep[] | null {
  const index = AUDIT_PIPELINE.indexOf(status as AuditPipelineStage);
  if (index === -1) return null;

  return AUDIT_PIPELINE.map((stage, i) => ({
    stage,
    label: CLIENT_STATUS[stage].label,
    state: i < index ? 'done' : i === index ? 'current' : 'upcoming',
  }));
}

/** What to say when an audit has left the rail. */
export function branchExplanation(status: AuditStatus): string | null {
  switch (status) {
    case 'no_team_present':
      return 'No fundraising team was present. Your credit has been returned and the auditor was paid in full — this is not a failed audit.';
    case 'cancelled':
      return 'This audit was cancelled and your credit has been returned.';
    default:
      return null;
  }
}

/** Only a released audit has something for the client to read. */
export function hasReport(status: AuditStatus): boolean {
  return status === 'released';
}
