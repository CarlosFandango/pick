import { color } from '@picksel/tokens';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, hairline, metaLabel, mono, pageTitle } from '@/lib/theme';
import { AdjustCredits } from './AdjustCredits';

/**
 * S4.5 — the charities on the platform.
 *
 * What they hold, what they have used, and the one write PICK needs: adjusting
 * a balance. Everything else about a charity is theirs to change.
 *
 * `residency_zone` is shown because it is the only place anyone will ever look
 * at it. It has been captured since day one and nothing consumes it yet —
 * putting it on screen is how it stops being invisible until the day it
 * matters.
 */
export default async function ClientsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: clients } = await supabase.rpc('client_roster');
  const rows = clients ?? [];

  return (
    <AdminChrome who={session.fullName} queuePosition={`${rows.length} CHARITIES`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />
        <h1 style={pageTitle}>Clients</h1>

        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>No charities on the platform yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
              Every charity, with what it holds and what it has used
            </caption>
            <thead>
              <tr>
                {['Charity', 'Residency', 'Credits', 'Booked', 'Released', ''].map((heading) => (
                  <th
                    key={heading || 'actions'}
                    scope="col"
                    style={{
                      ...metaLabel,
                      textAlign: heading === 'Charity' || heading === '' ? 'left' : 'right',
                      padding: '0 14px 8px 0',
                      borderBottom: hairline,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => (
                <tr key={client.organisation_id}>
                  <td style={cell}>
                    <span style={{ fontWeight: 600 }}>{client.name}</span>
                    {client.charity_number ? (
                      <span style={{ ...metaLabel, marginLeft: 8, fontFamily: mono }}>
                        {client.charity_number}
                      </span>
                    ) : null}
                    {!client.is_active ? (
                      <span style={{ ...metaLabel, marginLeft: 8, color: color.muted }}>
                        INACTIVE
                      </span>
                    ) : null}
                  </td>
                  <td style={{ ...cell, ...right, ...metaLabel }}>
                    {client.residency_zone.toUpperCase()}
                  </td>
                  <td style={{ ...cell, ...right, fontFamily: mono, fontWeight: 700 }}>
                    {client.balance}
                  </td>
                  <td style={{ ...cell, ...right, fontFamily: mono, color: color.bodyBrown }}>
                    {client.audits_booked}
                  </td>
                  <td style={{ ...cell, ...right, fontFamily: mono, color: color.bodyBrown }}>
                    {client.audits_released}
                  </td>
                  <td style={cell}>
                    <AdjustCredits organisationId={client.organisation_id} name={client.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminChrome>
  );
}

const cell = {
  padding: '11px 14px 11px 0',
  borderBottom: hairline,
  verticalAlign: 'top',
} as const;

const right = { textAlign: 'right' } as const;
