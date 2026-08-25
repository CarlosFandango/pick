import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export interface CookieStore {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

/** Request-scoped client. Runs as the signed-in user, so RLS applies. */
export function createClient(cookies: CookieStore) {
  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) cookies.set(name, value, options);
        },
      },
    },
  );
}

/**
 * Bypasses RLS. Use only where a business rule genuinely crosses tenant lines —
 * inviting a user, recording a credit purchase, matching an audit, building a
 * payout run — and keep that rule in code where it can be tested.
 * Never import this from apps/field.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}
