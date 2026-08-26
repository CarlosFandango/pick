import { useCallback, useEffect, useRef, useState } from 'react';

export interface Loaded<T> {
  data: T | null;
  error: Error | null;
  reload: () => void;
}

/**
 * Fetch once, expose the failure, allow a retry.
 *
 * Deliberately not a caching or revalidating library. An auditor's session is a
 * handful of screens read a few times each, and stale-while-revalidate would be
 * more machinery than the problem has — see the over-engineering list in
 * CLAUDE.md.
 *
 * The failure is surfaced rather than swallowed: this app runs where there is
 * no signal, and a screen that silently shows nothing is indistinguishable
 * from a screen with nothing to show.
 *
 * The fetcher is held in a ref rather than listed as a dependency. Callers
 * pass an inline closure, so a new identity every render would refetch forever.
 */
export function useLoad<T>(fetcher: () => Promise<T>): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const latest = useRef(fetcher);
  latest.current = fetcher;

  // A result arriving after the auditor has navigated away must not be written.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    setError(null);
    latest
      .current()
      .then((result) => {
        if (mounted.current) setData(result);
      })
      .catch((cause: Error) => {
        if (mounted.current) setError(cause);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
