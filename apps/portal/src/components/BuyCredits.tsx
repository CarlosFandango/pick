import { creditPriceLabel } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { hairline, metaLabel } from '@/lib/theme';

/**
 * How a charity gets more credits, while buying them online does not exist.
 *
 * Self-service purchase is a slice of its own — card capture, invoices, VAT,
 * refunds. Until it lands, a charity at zero credits still needs to know what
 * to do next, and "Top up before booking" with nothing to click is worse than
 * no message at all. This is deliberately a stopgap that says what actually
 * happens today rather than a disabled button implying something is coming.
 */
export function BuyCredits() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <section
      style={{
        background: color.paper,
        border: hairline,
        borderRadius: radius.tile,
        padding: '16px 20px',
        marginBottom: 20,
      }}
    >
      <h2 style={{ ...metaLabel, margin: 0 }}>Buying credits</h2>
      <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: color.bodyBrown }}>
        Credits are added to your account by PICK and invoiced at {creditPriceLabel()} each. Buying
        them here is not available yet — to order more,{' '}
        {support ? (
          <a href={`mailto:${support}?subject=PICKsel credits`} style={{ color: color.link }}>
            email {support}
          </a>
        ) : (
          'speak to your PICK account manager'
        )}
        .
      </p>
    </section>
  );
}
