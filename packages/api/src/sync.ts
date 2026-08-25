import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Insert } from './types';

/** The three append-only tables the field app pushes into. */
export type AppendOnlyTable = 'observation_log' | 'check_result' | 'evidence_attachment';

/**
 * Push a batch of device-minted rows.
 *
 * Ids come from the device, so a retry after a flaky connection is a no-op
 * rather than a duplicate. That is the whole sync strategy: no server-side
 * dedup, no merge, no last-writer-wins. Do not add one.
 */
export async function pushBatch<T extends AppendOnlyTable>(
  client: SupabaseClient<Database>,
  table: T,
  rows: Insert<T>[],
): Promise<{ accepted: number }> {
  if (rows.length === 0) return { accepted: 0 };

  const { error } = await client
    .from(table)
    // biome-ignore lint/suspicious/noExplicitAny: supabase-js insert generics do not narrow through T
    .upsert(rows as any, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw error;
  return { accepted: rows.length };
}
