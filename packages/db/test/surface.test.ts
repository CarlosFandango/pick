import { describe, expect, it } from 'vitest';
import { withDatabase } from './rls';

/**
 * The API surface, declared rather than remembered.
 *
 * Everything here is an inventory: it sweeps what the database actually
 * exposes and compares it to a list written down in this file. A new table, a
 * widened grant, a forgotten revoke or a function that quietly became an
 * overload all show up as a diff against that list, whether or not anybody
 * thought to write a test for it.
 *
 * That is the point. Behavioural tests only catch the holes somebody imagined;
 * four of the holes this suite was written for existed because nobody imagined
 * them. An inventory does not need to be imaginative — it needs to be complete
 * and to fail when the shape changes.
 *
 * Adding a table or an RPC means adding a line below. That is the intended
 * cost: it is the moment to decide what may touch the thing, rather than
 * inheriting an answer from the platform.
 */

/**
 * What `authenticated` may do to each table, beyond SELECT.
 *
 * SELECT is granted broadly on purpose — RLS decides which rows, and a policy
 * is a better place for a read rule than a grant. Writes are the opposite: a
 * write with an invariant behind it belongs in a `security definer` function,
 * so the table itself should refuse. A table absent from this list may not be
 * written by a signed-in user at all.
 */
const WRITABLE: Record<string, ReadonlyArray<'insert' | 'update' | 'delete'>> = {
  // The field app pushes these; ids are device-minted and inserts are
  // on-conflict-do-nothing. Append-only, so no update or delete anywhere.
  observation_log: ['insert'],
  check_result: ['insert'],
  evidence_attachment: ['insert'],
  // A charity raises a complaint (S3.6); PICK acknowledges and resolves it.
  complaint: ['insert', 'update', 'delete'],
  // The recorded credit purchase. Append-only, admin-gated by policy.
  credit_transaction: ['insert'],
  // An auditor's own flashcard progress (S1.4). Theirs to write and re-write.
  prep_progress: ['insert', 'update', 'delete'],
};

/** Functions a signed-in user is meant to call. Everything else is internal. */
const RPCS = [
  'accept_offer',
  'assignment_console',
  'book_audit',
  'decline_offer',
  'eligible_auditors',
  'offer_audit',
  'ops_counters',
  'ops_queue',
  'prefer_auditor',
  'release_audit',
  'report_no_team_present',
  'return_write_up',
  'review_gate_reason',
  'selectable_auditors',
  'submit_write_up',
  'void_audit',
  // Not an RPC: a column default, evaluated as the role doing the INSERT.
  'uuid_generate_v7',
] as const;

describe('table privileges are what this file says they are', () => {
  it('grants no write on a table not listed as writable', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ tablename: string; privilege: string }>(
        `select c.relname as tablename, p.privilege
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         cross join unnest(array['insert', 'update', 'delete']) as p(privilege)
         where n.nspname = 'public'
           and c.relkind = 'r'
           and has_table_privilege('authenticated', c.oid, p.privilege)
         order by 1, 2`,
      );

      const actual = new Map<string, string[]>();
      for (const row of rows) {
        actual.set(row.tablename, [...(actual.get(row.tablename) ?? []), row.privilege]);
      }

      const declared = Object.entries(WRITABLE)
        .map(([table, privileges]) => `${table}: ${[...privileges].sort().join(', ')}`)
        .sort();
      const found = [...actual.entries()]
        .map(([table, privileges]) => `${table}: ${privileges.sort().join(', ')}`)
        .sort();

      expect(found).toEqual(declared);
    });
  });

  it('lets a signed-in user read every table, because RLS decides the rows', async () => {
    await withDatabase(async (db) => {
      // has_any_column_privilege, not has_table_privilege: check_definition is
      // granted column by column so the compliance category can be withheld,
      // and a table-wide check reads that as "unreadable".
      const unreadable = await db.arrange<{ tablename: string }>(
        `select c.relname as tablename
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relkind = 'r'
           and not has_any_column_privilege('authenticated', c.oid, 'select')
         order by 1`,
      );
      // A table nobody may read is either a mistake or a table that should not
      // be in `public` at all. Both are worth a conversation.
      expect(unreadable.map((r) => r.tablename)).toEqual([]);
    });
  });

  it('withholds exactly the columns this file says are withheld', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ tablename: string; column_name: string }>(
        `select c.relname as tablename, a.attname as column_name
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
         where n.nspname = 'public'
           and c.relkind = 'r'
           and not has_column_privilege('authenticated', c.oid, a.attnum, 'select')
         order by 1, 2`,
      );
      // A column-level REVOKE is silently a no-op while a table-level grant
      // exists, so this asserts the outcome rather than the statement.
      expect(rows).toEqual([{ tablename: 'check_definition', column_name: 'compliance_category' }]);
    });
  });

  it('withholds UPDATE and DELETE on the append-only tables', async () => {
    await withDatabase(async (db) => {
      for (const table of ['observation_log', 'check_result', 'credit_transaction']) {
        const [row] = await db.arrange<{ upd: boolean; del: boolean }>(
          `select has_table_privilege('authenticated', $1, 'update') as upd,
                  has_table_privilege('authenticated', $1, 'delete') as del`,
          [`public.${table}`],
        );
        expect({ table, ...row }).toEqual({ table, upd: false, del: false });
      }
    });
  });
});

describe('the function surface is what this file says it is', () => {
  it('exposes exactly the listed functions to a signed-in user', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ proname: string }>(
        `select distinct p.proname
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and has_function_privilege('authenticated', p.oid, 'execute')
         order by 1`,
      );
      expect(rows.map((r) => r.proname)).toEqual([...RPCS].sort());
    });
  });

  it('exposes no function in public to anon or PUBLIC', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ proname: string }>(
        `select distinct p.proname
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
           on a.grantee = 0 and a.privilege_type = 'EXECUTE'
         where n.nspname = 'public'
           and (has_function_privilege('anon', p.oid, 'execute') or a.grantee is not null)
         order by 1`,
      );
      // grantee 0 is the PUBLIC pseudo-role. Postgres grants it EXECUTE on a
      // new function unless the schema says otherwise, which is how the
      // auditor-code function ended up callable by anyone who could connect.
      expect(rows.map((r) => r.proname)).toEqual([]);
    });
  });

  it('has no overloaded function name in public', async () => {
    await withDatabase(async (db) => {
      // `create or replace function` replaces a matching argument list and
      // silently overloads anything else, so a "rebuilt" RPC can leave its
      // previous version installed and granted. That is how an eight-argument
      // book_audit outlived the lead-time rule that replaced it.
      const rows = await db.arrange<{ proname: string; versions: string }>(
        `select p.proname, count(*)::text as versions
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
         group by p.proname
         having count(*) > 1
         order by 1`,
      );
      expect(rows).toEqual([]);
    });
  });

  it('pins a search_path on every security definer function and every app helper', async () => {
    await withDatabase(async (db) => {
      // A security definer function runs as its owner, so without a pinned
      // search_path the caller chooses which schema its unqualified names
      // resolve in — a privilege escalation, not a style preference.
      //
      // Schema `app` is held to the same rule whether or not a given helper is
      // security definer: those functions are the expressions every policy
      // evaluates and the triggers that enforce append-only, and "this one
      // happens to schema-qualify everything" is not a property to rely on.
      const rows = await db.arrange<{ nspname: string; proname: string }>(
        `select n.nspname, p.proname
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where (n.nspname = 'app' or (n.nspname = 'public' and p.prosecdef))
           and not exists (
             select 1 from unnest(coalesce(p.proconfig, '{}')) as c
             where c like 'search_path=%'
           )
         order by 1, 2`,
      );
      expect(rows).toEqual([]);
    });
  });
});

describe('every table is protected', () => {
  it('has RLS enabled on every table in public', async () => {
    await withDatabase(async (db) => {
      const unprotected = await db.arrange<{ tablename: string }>(
        "select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1",
      );
      expect(unprotected.map((t) => t.tablename)).toEqual([]);
    });
  });

  it('has at least one policy on every table', async () => {
    await withDatabase(async (db) => {
      const naked = await db.arrange<{ tablename: string }>(
        `select t.tablename from pg_tables t
         where t.schemaname = 'public'
           and not exists (
             select 1 from pg_policies p
             where p.schemaname = 'public' and p.tablename = t.tablename
           )
         order by 1`,
      );
      // RLS with no policy denies everything — safe, but always a mistake.
      expect(naked.map((t) => t.tablename)).toEqual([]);
    });
  });

  it('writes no policy for a role other than authenticated', async () => {
    await withDatabase(async (db) => {
      // A policy that names PUBLIC applies to anon too, and anon holds no
      // grants, so it would read as dead code while being the one policy that
      // could ever match an unauthenticated caller.
      const rows = await db.arrange<{ tablename: string; policyname: string; roles: string }>(
        `select tablename, policyname, roles::text
         from pg_policies
         where schemaname = 'public' and roles::text <> '{authenticated}'
         order by 1, 2`,
      );
      expect(rows).toEqual([]);
    });
  });
});
