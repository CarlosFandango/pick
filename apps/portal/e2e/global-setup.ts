import { Client } from 'pg';

const CONNECTION =
  process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const CHARITY = '00000000-0000-7000-8000-0000000000c1';
const CLIENT_USER = '00000000-0000-7000-8000-0000000000d1';
const FIXTURE_AUDIT = '00000000-0000-7000-8000-0000000000fa';
const FLOOR = 20;

/**
 * Put the database in a state the suite can start from.
 *
 * Two fixtures, for two different failure modes that both look like a broken
 * screen rather than an exhausted setup:
 *
 * - **Credits.** These tests book real audits and spend real credits, so a run
 *   that starts where the last one finished eventually fails on an empty
 *   balance. Credits are an append-only ledger, so this tops up rather than
 *   setting a value — there is no row to overwrite, by design.
 *
 * - **One audit that already exists.** A `pnpm db:reset` leaves no audits, so
 *   any spec that reads the list without booking first sees the empty state.
 *   Specs that only need "an audit is listed" should not have to spend a
 *   credit and wait for a booking to get one.
 *
 * Both are idempotent, because this runs before every suite.
 */
export default async function globalSetup() {
  const client = new Client({ connectionString: CONNECTION });
  await client.connect();

  try {
    await topUpCredits(client);
    await ensureFixtureAudit(client);
  } finally {
    await client.end();
  }
}

async function topUpCredits(client: Client) {
  const { rows } = await client.query<{ balance: string | null }>(
    'select sum(delta) as balance from credit_transaction where organisation_id = $1',
    [CHARITY],
  );
  const balance = Number(rows[0]?.balance ?? 0);
  if (balance >= FLOOR) return;

  await client.query(
    `insert into credit_transaction (organisation_id, delta, reason, unit_price_minor_units, note)
     values ($1, $2, 'purchase', 17500, 'Playwright top-up')`,
    [CHARITY, FLOOR - balance],
  );
}

/**
 * Inserted directly rather than through `book_audit`, deliberately: the window
 * rules move as the calendar does, and a fixture that has to satisfy them
 * would start failing on its own one day. The booking rules are covered where
 * they belong — in the integration suite and in s1.1-book.spec.ts.
 */
async function ensureFixtureAudit(client: Client) {
  await client.query(
    `insert into audit (
       id, client_organisation_id, status, audit_type, shift_payment_method,
       postcode, window_start_on, window_end_on, created_by, requested_at
     ) values (
       $1, $2, 'booked', 'street', 'direct_debit',
       'SE15 4QL', current_date + 7, current_date + 10, $3, now()
     )
     on conflict (id) do nothing`,
    [FIXTURE_AUDIT, CHARITY, CLIENT_USER],
  );
}
