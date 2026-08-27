import type { AuditStatus, PipelineStep } from '@picksel/core';
import { branchExplanation, pipelineSteps } from '@picksel/core';
import { color, fontSize, radius } from '@picksel/tokens';
import { hairline, metaLabel, srOnly } from '@/lib/theme';

/**
 * How each step reads.
 *
 * Two rules the first version broke. First, every colour here is a *text* pair
 * or a hairline, never a fill used as text — `auditing` is amber signage at
 * 1.75:1 on bone, its deep pair `auditingText` is 4.84:1. Second, done and
 * upcoming differ by the dot being filled or hollow, not by colour alone, so
 * the rail survives greyscale, a dim monitor and colour blindness.
 */
const STEP_STYLE = {
  done: { ink: color.bodyBrown, dot: color.teal, ring: color.teal, weight: 500, said: 'done' },
  current: {
    ink: color.auditingText,
    dot: color.auditing,
    ring: color.auditingText,
    weight: 700,
    said: 'current step',
  },
  upcoming: {
    ink: color.muted,
    dot: 'transparent',
    ring: color.muted,
    weight: 500,
    said: 'not started',
  },
} as const satisfies Record<PipelineStep['state'], unknown>;

/** S3.3 — where the audit has got to, or why it left the rail. */
export function PipelineRail({ status }: { status: AuditStatus }) {
  const steps = pipelineSteps(status);
  const branch = branchExplanation(status);

  if (!steps) {
    return (
      <div
        style={{
          background: color.paper,
          border: hairline,
          borderTop: `5px solid ${color.navy}`,
          borderRadius: radius.tile,
          padding: '14px 18px',
          fontSize: fontSize.sm,
          lineHeight: 1.55,
          color: color.bodyBrown,
        }}
      >
        {branch}
      </div>
    );
  }

  return (
    <ol
      aria-label="Audit progress"
      style={{ display: 'flex', gap: 0, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {steps.map((step, i) => {
        const style = STEP_STYLE[step.state];
        return (
          <li
            key={step.stage}
            aria-current={step.state === 'current' ? 'step' : undefined}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              aria-hidden
              style={{
                width: 11,
                height: 11,
                borderRadius: radius.pill,
                flex: 'none',
                boxSizing: 'border-box',
                background: style.dot,
                border: `2px solid ${style.ring}`,
              }}
            />
            <span style={{ ...metaLabel, color: style.ink, fontWeight: style.weight }}>
              {step.label}
              <span style={srOnly}> — {style.said}</span>
            </span>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: 2,
                  marginLeft: 4,
                  background: step.state === 'done' ? color.teal : color.muted,
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
