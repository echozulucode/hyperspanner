import { useCallback, useEffect, useState } from 'react';

/**
 * useHashRoute — minimal hash-based routing.
 *
 * Returns the current path (without the leading "#/") and a setter that
 * updates the hash. No matching/params — callers compare directly.
 *
 * Phase 2 only needs "gallery" vs the default. Phase 5 will likely replace
 * this with a richer router (with query + params) once we need deep links
 * into tools.
 */
export function useHashRoute(): [string, (next: string) => void] {
  const [path, setPath] = useState<string>(() => readHash());

  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: string) => {
    const normalized = next.startsWith('/') ? next.slice(1) : next;
    window.location.hash = `#/${normalized}`;
  }, []);

  return [path, navigate];
}

function readHash(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.location.hash;
  // strip leading "#" and optional "/"
  if (!raw) return '';
  const stripped = raw.startsWith('#') ? raw.slice(1) : raw;
  return stripped.startsWith('/') ? stripped.slice(1) : stripped;
}
