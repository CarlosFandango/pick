import { Chrome } from '@/components/Chrome';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { BookingForm } from './BookingForm';

/** S1.1 — Book an audit. One screen, no auditor choice, credits always visible. */
export default async function BookPage() {
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

  return (
    <Chrome
      active="book"
      organisationName={organisation?.name ?? '—'}
      credits={balance?.balance ?? 0}
    >
      <BookingForm credits={balance?.balance ?? 0} />
    </Chrome>
  );
}
