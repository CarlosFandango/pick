import { Client } from 'pg';

/**
 * RLS tests, run against a live local stack.
 *
 * Roles are impersonated the way Postgres actually evaluates them: `set local
 * role authenticated` plus the `request.jwt.claims` GUC that `auth.uid()`
 * reads. That exercises the real policy expressions — no HTTP, no JWT signing,
 * no mocking.
 *
 * Everything runs inside a transaction that is always rolled back, so tests
 * are isolated and leave the database exactly as they found it.
 *
 * Why this suite exists: policies were previously checked as `postgres`,
 * `service_role` and `anon`. All three skip the policy expression — the first
 * two bypass RLS, and anon matches no policy at all — so a missing GRANT that
 * broke every signed-in user went unnoticed. Test the role that matters.
 */
const CONNECTION =
  process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export const ids = {
  charityA: '00000000-0000-7000-8000-0000000c0001',
  charityB: '00000000-0000-7000-8000-0000000c0002',
  admin: '00000000-0000-7000-8000-0000000e0001',
  clientA: '00000000-0000-7000-8000-0000000e0002',
  clientB: '00000000-0000-7000-8000-0000000e0003',
  auditor: '00000000-0000-7000-8000-0000000e0004',
  otherAuditor: '00000000-0000-7000-8000-0000000e0005',
  auditA: '00000000-0000-7000-8000-0000000a0001',
  auditB: '00000000-0000-7000-8000-0000000a0002',
} as const;

/** Two charities, one admin, two clients, two auditors, one audit each. */
const FIXTURE = `
insert into auth.users (id, email, instance_id, aud, role) values
  ('${ids.admin}','admin@pick.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('${ids.clientA}','a@charity-a.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('${ids.clientB}','b@charity-b.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('${ids.auditor}','auditor@pick.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('${ids.otherAuditor}','other@pick.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

insert into organisation (id, name, org_type) values
  ('${ids.charityA}','Charity A','charity'),
  ('${ids.charityB}','Charity B','charity');

insert into user_profile (id, organisation_id, role, full_name, email, status) values
  ('${ids.admin}', null, 'pick_admin', 'Admin', 'admin@pick.test', 'active'),
  ('${ids.clientA}', '${ids.charityA}', 'client', 'Client A', 'a@charity-a.test', 'active'),
  ('${ids.clientB}', '${ids.charityB}', 'client', 'Client B', 'b@charity-b.test', 'active'),
  ('${ids.auditor}', null, 'auditor', 'Auditor', 'auditor@pick.test', 'active'),
  ('${ids.otherAuditor}', null, 'auditor', 'Other', 'other@pick.test', 'active');

insert into auditor_profile (user_id, approval_status, approved_at) values
  ('${ids.auditor}', 'approved', now()),
  ('${ids.otherAuditor}', 'approved', now());

insert into audit (id, client_organisation_id, auditor_id, status, postcode) values
  ('${ids.auditA}','${ids.charityA}','${ids.auditor}','assigned','SW1A 1AA'),
  ('${ids.auditB}','${ids.charityB}','${ids.otherAuditor}','assigned','EH12 9DN');

insert into credit_transaction (organisation_id, delta, reason, unit_price_minor_units) values
  ('${ids.charityA}', 10, 'purchase', 17500),
  ('${ids.charityB}', 5, 'purchase', 17500);
`;

export interface Session {
  /** Run a query as this user, with RLS applied. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Assert a statement is refused, returning the error message. */
  expectRefused(sql: string, params?: unknown[]): Promise<string>;
}

export interface Harness {
  /** `null` signs in as anon — no session at all. */
  as(userId: string | null): Session;
  /** Superuser escape hatch for arranging state RLS would forbid. */
  arrange<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Opens a transaction, loads the fixture, hands it to `body`, then rolls back
 * whatever happened.
 */
export async function withDatabase(body: (h: Harness) => Promise<void>): Promise<void> {
  const client = new Client({ connectionString: CONNECTION });
  await client.connect();

  try {
    await client.query('begin');
    await client.query(FIXTURE);

    const become = async (userId: string | null) => {
      // reset role first: a previous `set local role` is still in effect.
      await client.query('reset role');
      if (userId === null) {
        await client.query("select set_config('request.jwt.claims', '', true)");
        await client.query('set local role anon');
        return;
      }
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');
    };

    const harness: Harness = {
      arrange: async (sql, params) => {
        await client.query('reset role');
        const { rows } = await client.query(sql, params);
        return rows;
      },
      as: (userId) => ({
        query: async (sql, params) => {
          await become(userId);
          const { rows } = await client.query(sql, params);
          return rows;
        },
        expectRefused: async (sql, params) => {
          await become(userId);
          // Re-take the savepoint immediately before the attempt, so the
          // rollback below undoes THIS statement and nothing else. Taking it
          // once at the top of the transaction instead meant a refusal threw
          // away everything the test had arranged, silently — the assertions
          // afterwards then read an empty table and failed for the wrong
          // reason.
          await client.query('savepoint clean');
          try {
            await client.query(sql, params);
          } catch (error) {
            // A refused statement aborts the transaction; recover so the test
            // can carry on asserting.
            await client.query('rollback to savepoint clean').catch(() => undefined);
            return error instanceof Error ? error.message : String(error);
          }
          throw new Error(`expected the statement to be refused, but it succeeded:\n${sql}`);
        },
      }),
    };

    await client.query('savepoint clean');
    await body(harness);
  } finally {
    await client.query('rollback').catch(() => undefined);
    await client.end();
  }
}
