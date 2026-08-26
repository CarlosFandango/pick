import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  /** Null until the stored session has been read — not the same as signed out. */
  ready: boolean;
  auditorId: string | null;
}

const AuthContext = createContext<AuthState>({ session: null, ready: false, auditorId: null });

/**
 * Who is signed in, for the whole app.
 *
 * `ready` is separate from `session` on purpose. Reading a persisted session
 * from AsyncStorage is asynchronous, so for the first frame there is no
 * session *yet* — which is not the same as being signed out. Conflating them
 * bounces a signed-in auditor to the sign-in screen every cold start, which on
 * a street with no signal would be unrecoverable.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    ready: false,
    auditorId: null,
  });

  useEffect(() => {
    const client = supabase();
    let live = true;

    const apply = (session: Session | null) => {
      if (!live) return;
      setState({ session, ready: true, auditorId: session?.user.id ?? null });
    };

    client.auth.getSession().then(({ data }) => apply(data.session));
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) =>
      apply(session),
    );

    return () => {
      live = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/**
 * The signed-in auditor's id, for stamping locally-minted rows.
 *
 * Throws rather than returning null: every field event carries an
 * `auditor_id`, and a row written without one is a row RLS will refuse at sync
 * time — long after the auditor has walked away from the pitch.
 */
export function useAuditorId(): string {
  const { auditorId } = useAuth();
  if (!auditorId) throw new Error('No signed-in auditor');
  return auditorId;
}
