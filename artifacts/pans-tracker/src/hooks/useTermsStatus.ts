import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/react';
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

    // Pending agreement from the signup T&C step — PostHogSync will record it
    // shortly; treat as ok immediately so the user isn't blocked
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (pending) {
      try {
        const { version } = JSON.parse(pending) as { version: string };
        if (version === CURRENT_TERMS_VERSION) {
          setStatus('ok');
          return;
        }
      } catch { /* ignore */ }
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
      const email = user?.emailAddresses?.[0]?.emailAddress;
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
