import { fontSize, radius, space } from '@picksel/tokens';
import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: 'var(--colour-surface)',
        border: '1px solid var(--colour-border)',
        borderRadius: radius.lg,
        padding: space.lg,
      }}
    >
      {title ? (
        <h2
          style={{ fontSize: fontSize.lg, marginBlockEnd: space.sm, color: 'var(--colour-text)' }}
        >
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
