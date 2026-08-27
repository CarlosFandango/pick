import { bundleLabel, type CreditBundle, sortBundles } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { hairline, metaLabel } from '@/lib/theme';

/**
 * The price list, and how a charity gets more credits.
 *
 * Self-service purchase is a slice of its own — card capture, invoices, VAT,
 * refunds. Until it lands, a charity at zero credits still needs to know what
 * to do next, and "Top up before booking" with nothing to click is worse than
 * no message at all. Deliberately not a disabled "Buy" button, which would
 * imply something is arriving imminently.
 *
 * Prices come from `credit_bundle`, never from a constant here: a price that
 * lived in the app would silently disagree with what was actually charged.
 */
export function BuyCredits({ bundles }: { bundles: readonly CreditBundle[] }) {
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

      {bundles.length > 0 ? (
        <table
          style={{
            width: '100%',
            maxWidth: 420,
            borderCollapse: 'collapse',
            fontSize: fontSize.sm,
            margin: '12px 0 0',
          }}
        >
          <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 6 }}>
            The more you buy, the less each audit costs
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ ...metaLabel, textAlign: 'left', paddingBottom: 6 }}>
                Credits
              </th>
              <th scope="col" style={{ ...metaLabel, textAlign: 'left', paddingBottom: 6 }}>
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {sortBundles(bundles).map((bundle) => (
              <tr key={bundle.quantity}>
                <td
                  style={{
                    padding: '7px 16px 7px 0',
                    borderTop: hairline,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {bundle.quantity}
                </td>
                <td style={{ padding: '7px 0', borderTop: hairline, color: color.bodyBrown }}>
                  {bundleLabel(bundle)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <p
        style={{
          margin: '14px 0 0',
          fontSize: fontSize.sm,
          lineHeight: 1.6,
          color: color.bodyBrown,
        }}
      >
        Credits are added to your account by PICK and invoiced. Buying them here is not available
        yet — to order more,{' '}
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
