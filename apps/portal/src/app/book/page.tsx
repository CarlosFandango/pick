import { Chrome } from '@/components/Chrome';
import { clientPage } from '@/lib/client-page';
import { supabaseServer } from '@/lib/supabase';
import { BookingForm } from './BookingForm';

/** S1.1 — Book an audit. One screen, no auditor choice, credits always visible. */
export default async function BookPage() {
  const { organisationName, credits } = await clientPage();

  // The gazetteer is public reference data, so this is a plain read. A
  // type-ahead belongs here once there are more than a few dozen places.
  const supabase = await supabaseServer();
  const { data: places } = await supabase.from('place').select('id, name, region').order('name');

  return (
    <Chrome active="book" organisationName={organisationName} credits={credits}>
      <BookingForm credits={credits} places={places ?? []} />
    </Chrome>
  );
}
