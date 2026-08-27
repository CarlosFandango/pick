import { AdminChrome } from '@/components/AdminChrome';
import { ClientsTable } from '@/components/admin/ClientsTable';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, pageTitle } from '@/lib/theme';
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

        <ClientsTable
          clients={rows.map((c) => ({
            organisationId: c.organisation_id,
            name: c.name,
            residencyZone: c.residency_zone,
            charityNumber: c.charity_number,
            isActive: c.is_active,
            balance: c.balance,
            auditsBooked: c.audits_booked,
            auditsReleased: c.audits_released,
          }))}
          actions={(client) => (
            <AdjustCredits organisationId={client.organisationId} name={client.name} />
          )}
        />
      </div>
    </AdminChrome>
  );
}
