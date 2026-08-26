import type { Database } from '@picksel/api';
import { createClient } from '@picksel/api/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The one Supabase client on the device.
 *
 * Session storage is AsyncStorage, injected rather than imported inside
 * `@picksel/api` so that package stays free of React Native and the portal can
 * keep using it. `persistSession` matters more here than on the web: an auditor
 * force-quits the app between the offer and the shift, and being signed out on
 * a street with no signal is the end of the audit.
 *
 * Never the service role. `apps/field` ships to devices we do not control, and
 * `pnpm check:secrets` fails the build if that key is ever imported here.
 */
let client: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  client ??= createClient(AsyncStorage);
  return client;
}

/** Test seam: forget the handle so the next call builds a fresh one. */
export function resetSupabaseHandle(): void {
  client = null;
}
