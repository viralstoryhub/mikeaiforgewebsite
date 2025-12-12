import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../services/analyticsService';

const calendlyUrl = import.meta.env.VITE_CALENDLY_URL as string | undefined;

const ensureCalendlyScript = () => {
  if (!calendlyUrl) return;
  const id = 'calendly-widget-script';
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  document.body.appendChild(s);
};

const FloatingCTA: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    ensureCalendlyScript();
  }, []);

  const onClick = useCallback(() => {
    trackEvent('cta_click', { cta: 'floating_book_call' });
    if (calendlyUrl && (window as any).Calendly?.initPopupWidget) {
      (window as any).Calendly.initPopupWidget({ url: calendlyUrl });
    } else if (calendlyUrl) {
      // Fallback: navigate to inline page
      navigate('/book');
    } else {
      navigate('/contact');
    }
  }, [navigate]);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-brand-primary text-white font-semibold hover:opacity-90 transition-opacity"
      aria-label="Book a call"
      data-analytics-event="cta_click"
      data-analytics-props='{"cta":"floating_book_call"}'
    >
      <span>Book a call</span>
    </button>
  );
};

export default FloatingCTA;

