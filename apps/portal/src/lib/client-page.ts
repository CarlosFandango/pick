import { requireRole, type Session } from './auth';
import { supabaseServer } from './supabase';

export interface ClientPageContext {
  session: Session;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  /** The charity's name for the chrome. An em dash when it cannot be read. */
  organisationName: string;
  /** `sum(delta)` from the ledger view. Never a stored column — it cannot drift. */
  credits: number;
}

/**
 * What every client screen needs before it can render its own content.
 *
 * The chrome keeps the charity's name and credit count permanently on screen,
 * so six pages were each opening with the same twenty lines: gate the role,
 * make a client, fetch the organisation and the balance together. Changing
 * what the chrome shows meant six edits, and six chances to miss one.
 *
 * Both queries run as the signed-in user, so RLS scopes them — the role gate
 * above is convenience, not the boundary.
 */
export async function clientPage(): Promise<ClientPageContext> {
  const session = await requireRole('client', 'pick_admin');
  const supabase = await supabaseServer();

  const [{ data: organisation }, { data: balance }] = await Promise.all([
    supabase
      .from('organisation')
      .select('name')
      .eq('id', session.organisationId ?? '')
      .single(),
    supabase
      .from('organisation_credit_balance')
      .select('balance')
      .eq('organisation_id', session.organisationId ?? '')
      .maybeSingle(),
  ]);

  return {
    session,
    supabase,
    organisationName: organisation?.name ?? '—',
    credits: balance?.balance ?? 0,
  };
}
