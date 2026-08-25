import { fontSize, radius, space, touchTarget } from '@picksel/tokens';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Styles reference token *roles*, never raw values, so a rebrand is a theme
 * swap. The colour custom properties come from `themeToCssVariables()`; the
 * sizes are inlined from the shared scale so the portal and the field app space
 * things identically.
 */
export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      data-variant={variant}
      style={{
        minHeight: touchTarget.minimum,
        paddingInline: space.md,
        paddingBlock: space.sm,
        // The brand allows a 100px pill or a 4-5px tile and nothing between.
        borderRadius: radius.pill,
        fontSize: fontSize.md,
        background: `var(--colour-${variant === 'secondary' ? 'surface-raised' : variant})`,
        color: `var(--colour-${variant === 'secondary' ? 'text' : 'text-inverse'})`,
        border: `1px solid var(--colour-border)`,
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    />
  );
}
