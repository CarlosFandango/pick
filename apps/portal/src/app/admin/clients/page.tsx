import { clientsLede } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { ClientsTable } from '@/components/admin/ClientsTable';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
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

  // Two credits is the threshold because it is the last point at which an
  // invoice can be raised, paid and applied before a charity finds they cannot
  // book. Below that we are reacting rather than selling.
  const runningLow = rows
    .filter((c) => c.is_active && c.balance <= 2)
    .sort((a, b) => a.balance - b.balance)
    .map((c) => ({ name: c.name, balance: c.balance }));

  return (
    <AdminChrome who={session.fullName} queuePosition={`${rows.length} CHARITIES`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />
        <h1 style={pageTitle}>Clients</h1>

        <Lede
          {...clientsLede({
            total: rows.length,
            runningLow,
            // The concern count is not on the roster yet — the triage screen
            // owns that, and widening client_roster for a headline nobody has
            // asked for is the wrong order to build in.
            openConcerns: 0,
          })}
        />

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
