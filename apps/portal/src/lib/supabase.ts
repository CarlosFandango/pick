import { createClient as createServerSupabase } from '@picksel/api/server';
import { cookies } from 'next/headers';

/** Request-scoped Supabase client. Runs as the signed-in user, so RLS applies. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerSupabase({
    getAll: () => store.getAll(),
    set: (name, value, options) => {
      try {
        store.set(name, value, options);
      } catch {
        // Called from a Server Component, where cookies are read-only.
        // Session refresh happens in middleware instead.
      }
    },
  });
}
