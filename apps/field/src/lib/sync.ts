import { openDatabase } from '@/db/client';
import { flushOutbox, type SyncOutcome } from '@/sync/outbox';
import { supabase } from './supabase';

/**
 * Push everything the device has not yet acknowledged.
 *
 * Called at the moments an auditor is plausibly back in signal — opening the
 * offers list, ending a session, submitting a write-up — rather than on a
 * timer. A background worker for something that happens a few times a shift
 * would be machinery the problem does not have, and a failed push is not an
 * error: the rows stay queued and go next time.
 *
 * Never throws. Sync failing must never stop an auditor doing their job.
 */
export async function syncNow(): Promise<SyncOutcome | null> {
  try {
    return await flushOutbox(await openDatabase(), supabase());
  } catch {
    return null;
  }
}
