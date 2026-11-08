import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

/**
 * Load something async for a page: `data` once it arrives, `error` when it failed, `reload()` to fetch again after a change.
 * The loader is re-run when `deps` change; a result that arrives after a newer load started is dropped.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const run = useCallback(() => {
    const n = ++seq.current;
    setLoading(true);
    load().then((d) => { if (n === seq.current) { setData(d); setError(null); setLoading(false); } })
      .catch((e: unknown) => { if (n === seq.current) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: run, setData };
}

/** Width-based breakpoints for the shells: `mobile` under 720, `tight` under 1000. */
export function useViewport() {
  const [w, setW] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth));
  useEffect(() => { const on = () => setW(window.innerWidth); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  return { width: w, mobile: w < 720, tight: w < 1000 };
}
