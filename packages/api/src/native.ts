import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export interface NativeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Expo client. Session storage is injected so @picksel/api stays free of any
 * React Native dependency and the portal can keep importing it.
 */
export function createClient(storage: NativeStorage) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY');

  return createSupabaseClient<Database>(url, key, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
