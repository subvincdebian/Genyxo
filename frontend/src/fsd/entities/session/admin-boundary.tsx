'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** The server checks the token and role; cached localStorage role is never authority. */
export function AdminBoundary({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Browser storage is an external system read after hydration.
      queueMicrotask(() => { if (active) setStatus('denied'); });
      return () => { active = false; };
    }
    const abort = new AbortController();
    fetch('/api/are-you-sure-you-want-to-admin/users?page=1&limit=1', {
      headers: { Authorization: `Bearer ${token}` }, signal: abort.signal, cache: 'no-store',
    }).then(response => {
      if (response.ok) setStatus('allowed');
      else if (response.status === 401 || response.status === 403) setStatus('denied');
      else setStatus('error');
    }).catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => { active = false; abort.abort(); };
  }, []);
  if (status === 'allowed') return children;
  return <main className="gx:flex gx:min-h-screen gx:items-center gx:justify-center gx:bg-black gx:text-white">
    {status === 'loading' ? <p role="status">Loading…</p> : <div role="alert"><p>{status === 'denied' ? 'Access denied' : 'Unable to verify access. Please try again.'}</p><a href="/">Return to Genyxo</a></div>}
  </main>;
}

