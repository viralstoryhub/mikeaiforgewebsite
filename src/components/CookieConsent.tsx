import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'consent.ga';

type ConsentState = 'granted' | 'denied' | 'unset';

const readStoredConsent = (): ConsentState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {}
  return 'unset';
};

const setStoredConsent = (state: ConsentState) => {
  try { localStorage.setItem(STORAGE_KEY, state); } catch {}
};

const updateGtagConsent = (granted: boolean) => {
  if (typeof window === 'undefined') return;
  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
    });
  }
};

const CookieConsent: React.FC = () => {
  const [state, setState] = useState<ConsentState>('unset');

  useEffect(() => {
    setState(readStoredConsent());
  }, []);

  if (state !== 'unset') return null;

  const choose = (granted: boolean) => {
    const newState: ConsentState = granted ? 'granted' : 'denied';
    setStoredConsent(newState);
    setState(newState);
    // Best-effort: attempt to update consent now (analyticsService also handles)
    updateGtagConsent(granted);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-5xl m-4 p-4 rounded-xl border border-border-dark bg-dark-secondary shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <p className="text-sm text-light-secondary flex-1">
            We use cookies for analytics to improve your experience. You can accept or decline.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => choose(false)}
              className="px-4 py-2 rounded-lg border border-border-dark text-light-secondary hover:bg-white/5"
            >
              Decline
            </button>
            <button
              onClick={() => choose(true)}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

