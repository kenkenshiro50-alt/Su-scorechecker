import { useEffect, useState } from 'react';

export async function api(url, opt) {
  const r = await fetch(url, opt);
  let d = {};
  try { d = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

export function useFetch(url) {
  const [s, setS] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    if (!url) return;
    let live = true;
    setS({ loading: true, data: null, error: null });
    api(url).then(d => live && setS({ loading: false, data: d, error: null }))
      .catch(e => live && setS({ loading: false, data: null, error: e.message }));
    return () => { live = false; };
  }, [url]);
  return s;
}
