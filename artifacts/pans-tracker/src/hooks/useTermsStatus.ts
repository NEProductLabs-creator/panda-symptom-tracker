import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@/hooks/useSupabaseAuth';
import { CURRENT_TERMS_VERSION } from '@/lib/termsVersion';

const SESSION_OK_KEY = 'pans_terms_ok';
const PENDING_KEY = 'pans_terms_pending';

export type TermsStatus = 'loading' | 'ok' | 'needs-agreement';

export function useTermsStatus() {
  const { getToken } = useAuth();
  const { user, isSignedIn, isLoaded } = useUser();
  const [status, setStatus] = useState<TermsStatus>('loading');

  const checkStatus = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setStatus('ok');
      return;
    }

    // Session cache — already confirmed this session
    if (sessionStorage.getItem(SESSION_OK_KEY) === CURRENT_TERMS_VERSION) {
      setStatus('ok');
      return;
    }

    // Pending agreement captured during the signup T&C pre-step. Record it
    // authoritatively to the server here (not time-gated, so it survives
    // Supabase's delayed email-confirmation flow), and only clear the pending
    // key once the server accepts it. Check localStorage too — Google OAuth
    // clears sessionStorage on redirect.
    const pending = sessionStorage.getItem(PENDING_KEY) ?? localStorage.getItem(PENDING_KEY);
    if (pending) {
      try {
        const { version } = JSON.parse(pending) as { version: string };
        if (version === CURRENT_TERMS_VERSION) {
          const token = await getToken();
          const email = user?.email ?? undefined;
          const res = await fetch('/api/terms/agree', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ email, terms_version: version, context: 'signup' }),
          });
          if (res.ok) {
            // Persisted — safe to drop the pending key and cache for the session.
            sessionStorage.removeItem(PENDING_KEY);
            localStorage.removeItem(PENDING_KEY);
            sessionStorage.setItem(SESSION_OK_KEY, CURRENT_TERMS_VERSION);
          }
          // Don't block this session either way; if the write failed the key
          // remains so the next mount retries the recording.
          setStatus('ok');
          return;
        }
      } catch {
        // Network/parse failure — don't block; pending key is retried next mount.
        setStatus('ok');
        return;
      }
    }

    try {
      const token = await getToken();
      const res = await fetch('/api/terms/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setStatus('ok'); // server error — don't block user
        return;
      }
      const data = (await res.json()) as { terms_version_agreed: string | null };
      if (data.terms_version_agreed === CURRENT_TERMS_VERSION) {
        sessionStorage.setItem(SESSION_OK_KEY, CURRENT_TERMS_VERSION);
        setStatus('ok');
      } else {
        setStatus('needs-agreement');
      }
    } catch {
      setStatus('ok'); // network failure — don't block user
    }
  }, [isLoaded, isSignedIn, user, getToken]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const recordAgreement = useCallback(async () => {
    try {
      const token = await getToken();
      const email = user?.email ?? undefined;
      await fetch('/api/terms/agree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          terms_version: CURRENT_TERMS_VERSION,
          context: 'signup',
        }),
      });
      sessionStorage.setItem(SESSION_OK_KEY, CURRENT_TERMS_VERSION);
      setStatus('ok');
    } catch {
      setStatus('ok'); // best-effort
    }
  }, [getToken, user]);

  return { status, recordAgreement };
}
