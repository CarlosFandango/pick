import { Chrome } from '@/components/Chrome';
import { clientPage } from '@/lib/client-page';
import { BookingForm } from './BookingForm';

/** S1.1 — Book an audit. One screen, no auditor choice, credits always visible. */
export default async function BookPage() {
  const { organisationName, credits } = await clientPage();

  return (
    <Chrome active="book" organisationName={organisationName} credits={credits}>
      <BookingForm credits={credits} />
    </Chrome>
  );
}
