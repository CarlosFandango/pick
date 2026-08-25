import { Client } from 'pg';

const CONNECTION =
  process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const CHARITY = '00000000-0000-7000-8000-0000000000c1';
const FLOOR = 20;

/**
 * Give the suite a known starting balance.
 *
 * These tests book real audits and spend real credits, so a run that starts
 * where the last one finished eventually fails on an empty balance — and the
 * failure looks like a broken booking screen rather than an exhausted fixture.
 *
 * Credits are an append-only ledger, so this tops up rather than setting a
 * value: there is no row to overwrite, by design.
 */
export default async function globalSetup() {
  const client = new Client({ connectionString: CONNECTION });
  await client.connect();

  try {
    const { rows } = await client.query<{ balance: string | null }>(
      'select sum(delta) as balance from credit_transaction where organisation_id = $1',
      [CHARITY],
    );
    const balance = Number(rows[0]?.balance ?? 0);

    if (balance < FLOOR) {
      await client.query(
        `insert into credit_transaction (organisation_id, delta, reason, unit_price_pence, note)
         values ($1, $2, 'purchase', 17500, 'Playwright top-up')`,
        [CHARITY, FLOOR - balance],
      );
    }
  } finally {
    await client.end();
  }
}
