import { apiClient } from './apiClient';

// Google Analytics 4
const GA_MEASUREMENT_ID: string | undefined =
  import.meta.env.VITE_GA_MEASUREMENT_ID ||
  (typeof window !== 'undefined' ? window.__GA_ID__ : undefined) ||
  // Fallback for environments that inject a non-VITE variable
  (typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta as unknown as { env: Record<string, string | undefined> }).env
        .GOOGLE_ANALYTICS_ID
    : undefined);

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
}

// Internal flags to ensure initialization only happens once
let isGAInitialized = false;
let routeListenerAttached = false;

/**
 * Inject the GA script tag if not already present.
 * This is idempotent and will not append multiple script tags.
 */
function injectGAScript(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;

  const src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  const existing = Array.from(document.getElementsByTagName('script')).find((s) =>
    s.src?.includes(src)
  );
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/**
 * Sets up the window.dataLayer and window.gtag function if not already defined.
 * Calls the basic gtag initialization (js + config).
 */
function setupGtag(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;

  // Ensure dataLayer exists
  window.dataLayer = window.dataLayer || [];

  // If gtag already exists, do not overwrite it (idempotent)
  if (!window.gtag) {
    const gtagFn = (...args: unknown[]) => {
      window.dataLayer.push(args as unknown[]);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.gtag = gtagFn as (...args: any[]) => void;
  }

  try {
    // Fire basic gtag initialization - this is safe to call multiple times,
    // but we guard with isGAInitialized to avoid duplicate init calls.
    if (!isGAInitialized) {
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID);
      isGAInitialized = true;
    }
  } catch (err) {
    // Swallow errors - not critical for app flow
    console.error('Failed to initialize gtag:', err);
  }
}

/**
 * Attach listeners to capture SPA route changes and emit page_view events.
 * This is idempotent; multiple calls will not attach duplicate listeners.
 */
function attachRouteChangeListener(): void {
  if (typeof window === 'undefined' || routeListenerAttached) return;

  const handleRouteChange = () => {
    try {
      const path = window.location.pathname + window.location.search + window.location.hash;
      // Use existing helper to track page view with hash for HashRouter
      trackPageView(path);
    } catch (err) {
      console.error('Error handling route change for analytics:', err);
    }
  };

  try {
    // Wrap pushState
    const originalPushState = history.pushState;
    history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
      // Call original
      originalPushState.apply(this, args);
      // Trigger handler asynchronously to ensure location is updated
      setTimeout(handleRouteChange, 0);
    };

    // Wrap replaceState
    const originalReplaceState = history.replaceState;
    history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
      originalReplaceState.apply(this, args);
      setTimeout(handleRouteChange, 0);
    };

    // popstate for back/forward navigation
    window.addEventListener('popstate', handleRouteChange);

    routeListenerAttached = true;
  } catch (err) {
    console.error('Failed to attach route change listeners for analytics:', err);
  }
}

/**
 * Attach a generic click listener to capture elements with data-analytics-event attributes.
 * Usage: add data-analytics-event="<event_name>" and optional data-analytics-props='{"key":"value"}' on any clickable element.
 */
let clickListenerAttached = false;
function attachClickTracking(): void {
  if (typeof window === 'undefined' || clickListenerAttached) return;
  try {
    document.addEventListener(
      'click',
      (e) => {
        const clicked = e.target as HTMLElement;
        const target = clicked?.closest('[data-analytics-event]') as HTMLElement | null;
        if (target) {
          const eventName = target.getAttribute('data-analytics-event');
          if (!eventName) return;
          const propsAttr = target.getAttribute('data-analytics-props');
          let props: Record<string, unknown> = {};
          if (propsAttr) {
            try {
              props = JSON.parse(propsAttr) as Record<string, unknown>;
            } catch (errParse) {
              /* ignore */
            }
          }
          // If this is an outbound link, annotate automatically
          if (target.tagName === 'A') {
            const href = (target as HTMLAnchorElement).href;
            const isOutbound =
              href && new URL(href, window.location.href).hostname !== window.location.hostname;
            if (isOutbound) {
              props = { ...props, url: href };
            }
          }
          trackEvent(eventName, props);
          return;
        }
        // Auto-track outbound link clicks even without data attributes
        const anchor = clicked?.closest('a') as HTMLAnchorElement | null;
        if (anchor && anchor.href) {
          try {
            const url = new URL(anchor.href, window.location.href);
            const isOutbound = url.hostname !== window.location.hostname;
            if (isOutbound) {
              trackEvent('outbound_click', { url: anchor.href });
            }
          } catch (errUrl) {
            /* ignore */
          }
        }
      },
      { capture: true }
    );
    clickListenerAttached = true;
  } catch (err) {
    console.error('Failed to attach click tracking listener:', err);
  }
}

/**
 * Public function to initialize analytics (GA + route tracking).
 * - Ensures GA script is injected only once
 * - Ensures gtag is setup only once
 * - Attaches SPA route change listeners to track page views
 *
 * Call this as early as possible in your app startup (e.g., App.tsx entry).
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  if (!GA_MEASUREMENT_ID) {
    // No GA configured; surface a non-fatal warning to help diagnose prod issues
    try {
      console.warn(
        '[Analytics] GA not initialized: missing GA measurement ID (VITE_GA_MEASUREMENT_ID or fallback).'
      );
    } catch (e) {
      // ignore - even warning logging can fail in restricted environments
    }
    return;
  }

  injectGAScript();
  setupGtag();
  // Apply saved consent (if any)
  try {
    const stored = localStorage.getItem('consent.ga');
    if (stored === 'granted' || stored === 'denied') {
      const granted = stored === 'granted';
      window.gtag?.('consent', 'update', {
        ad_storage: granted ? 'granted' : 'denied',
        analytics_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
      });
    }
  } catch (e) {
    // ignore
  }

  attachRouteChangeListener();
  attachClickTracking();
}

export function updateConsent(granted: boolean): void {
  try {
    localStorage.setItem('consent.ga', granted ? 'granted' : 'denied');
  } catch (e) {
    // ignore
  }
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
  });
}

/**
 * Returns true if analytics (GA) appears to be configured and initialized.
 */
export function isAnalyticsConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return !!GA_MEASUREMENT_ID && !!window.gtag && isGAInitialized;
}

/**
 * Lightweight runtime status for diagnostics (can be shown on an admin page)
 */
export function getAnalyticsStatus() {
  return {
    measurementIdPresent: Boolean(GA_MEASUREMENT_ID),
    gtagDefined: typeof window !== 'undefined' && typeof window.gtag === 'function',
    initialized: isGAInitialized,
  };
}

// Initialize Google Analytics immediately if measurement ID is present
// This preserves existing behavior while still allowing explicit initializeAnalytics() calls.
if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
  injectGAScript();
  setupGtag();
  // Do not automatically attach route listeners here to avoid double-attaching
  // if initializeAnalytics() is called explicitly later. Attach here only if not already attached.
  attachRouteChangeListener();
}

// Initialize Mixpanel (if token provided)
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
if (MIXPANEL_TOKEN && typeof window !== 'undefined') {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-rest-params */
  (function (f: Document, b: any) {
    if (!b.__SV) {
      const a = window;
      let c: any;
      let d: any;
      let e: any;
      let g: any;
      let h: any;
      let i: any;
      a.mixpanel = b;
      b._i = [];
      b.init = function (a: string, c: any, d?: string) {
        function e(b: any, a: any) {
          const c = a.split('.');
          if (c.length === 2) {
            b = b[c[0]];
            a = c[1];
          }
          b[a] = function () {
            // legacy snippet uses arguments; adapted for lint compliance
            b.push([a].concat(Array.prototype.slice.call(arguments as unknown as IArguments, 0)));
          };
        }
        let f: any = b;
        if (typeof d !== 'undefined') {
          f = b[d] = [];
        } else {
          d = 'mixpanel';
        }
        f.people = f.people || [];
        f.toString = function (b?: boolean) {
          let a = 'mixpanel';
          if (d !== 'mixpanel') {
            a += '.' + d;
          }
          if (!b) {
            a += ' (stub)';
          }
          return a;
        };
        f.people.toString = function () {
          return f.toString(1) + '.people (stub)';
        };
        const functions =
          'disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user'.split(
            ' '
          );
        for (g = 0; g < functions.length; g++) e(f, functions[g]);
        b._i.push([a, c, d]);
      };
      b.__SV = 1.2;
      const cEl = f.createElement('script');
      cEl.type = 'text/javascript';
      cEl.async = true;
      cEl.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      const dEl = f.getElementsByTagName('script')[0];
      dEl.parentNode?.insertBefore(cEl, dEl);
    }
  })(document, window.mixpanel || []);
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-inner-declarations */
  window.mixpanel?.init(MIXPANEL_TOKEN);
}

export const trackEvent = (eventName: string, properties: Record<string, unknown> = {}): void => {
  if (import.meta.env.DEV) {
    console.warn('[Analytics Event]', {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }

  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track(eventName, properties as Record<string, unknown>);
  }

  // Only send to backend in production to reduce noise in local/dev
  if (!import.meta.env.DEV) {
    apiClient
      .post('/analytics/track', {
        eventName: eventName,
        properties,
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to track event on backend:', error);
        }
      });
  }
};

export const identifyUser = (userId: string, traits: Record<string, unknown> = {}): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', { user_id: userId });
  }

  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.identify(userId);
    window.mixpanel.people.set(traits as Record<string, unknown>);
  }
};

export const trackPageView = (path: string): void => {
  trackEvent('page_view', { page_path: path });
};

declare global {
  interface Window {
    dataLayer: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mixpanel: any;
    __GA_ID__?: string;
  }
}

export type { AnalyticsEvent };
