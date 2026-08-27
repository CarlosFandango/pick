import type { AuditStatus } from '@picksel/core';
import { branchExplanation, pipelineSteps } from '@picksel/core';
import { color, fontSize, radius } from '@picksel/tokens';
import { hairline, metaLabel } from '@/lib/theme';

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
      {steps.map((step, i) => (
        <li
          key={step.stage}
          aria-current={step.state === 'current' ? 'step' : undefined}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: radius.pill,
              flex: 'none',
              background:
                step.state === 'upcoming'
                  ? color.oat
                  : step.state === 'current'
                    ? color.auditing
                    : color.teal,
            }}
          />
          <span
            style={{
              ...metaLabel,
              color: step.state === 'upcoming' ? color.oat : color.bodyBrown,
              fontWeight: step.state === 'current' ? 700 : 500,
            }}
          >
            {step.label}
          </span>
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background: step.state === 'done' ? color.teal : color.oat,
              }}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
