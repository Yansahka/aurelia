import { useCallback, useEffect, useRef, useState } from 'react';

// Mini cache « stale-while-revalidate ». Remplaçable par TanStack Query sans changer les pages.
const cache = new Map();
const subs = new Set();
let generation = 0;
export function clearCache() { generation++; cache.clear(); }

// invalidate('orders', 'stats') : relance toutes les requêtes dont la clé commence par ces préfixes.
export function invalidate(...prefixes) {
  [...cache.keys()].forEach((k) => prefixes.some((p) => k.startsWith(p)) && cache.delete(k));
  subs.forEach((f) => f(prefixes));
}

export function useQuery(key, fetcher) {
  const [s, set] = useState(() => ({ data: cache.get(key), loading: !cache.has(key), error: null }));
  const fRef = useRef(fetcher); fRef.current = fetcher;
  const alive = useRef(true);
  const latest = useRef(0);
  const run = useCallback(() => {
    const started = generation;
    const request = ++latest.current;
    set(p => ({ ...p, error: null, loading: !cache.has(key) }));
    return fRef.current()
      .then((d) => { if (started !== generation || request !== latest.current || !alive.current) return; cache.set(key, d); set({ data: d, loading: false, error: null }); })
      .catch((e) => { if (started !== generation || request !== latest.current || !alive.current) return; set((p) => ({ ...p, loading: false, error: e })); });
  }, [key]);

  useEffect(() => {
    alive.current = true;
    set({ data: cache.get(key), loading: !cache.has(key), error: null });
    run();
    const on = (ps) => ps.some((p) => key.startsWith(p)) && run();
    subs.add(on);
    return () => { alive.current = false; latest.current++; subs.delete(on); };
  }, [key, run]);

  return { ...s, refetch: run };
}
