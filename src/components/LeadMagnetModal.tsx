import React, { useEffect, useState } from 'react';
import { trackEvent } from '../services/analyticsService';

interface LeadMagnetModalProps {
  /** Override to force show modal (for testing) */
  forceShow?: boolean;
}

const LeadMagnetModal: React.FC<LeadMagnetModalProps> = ({ forceShow = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage to see if user has already seen or dismissed the modal
    const dismissed = localStorage.getItem('leadMagnetDismissed');
    const submitted = localStorage.getItem('leadMagnetSubmitted');
    
    if (dismissed === 'true' || submitted === 'true') {
      setHasBeenShown(true);
      return;
    }

    // Exit-intent detection: mouse leaving viewport from top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasBeenShown && !isVisible) {
        setIsVisible(true);
        setHasBeenShown(true);
        trackEvent('lead_magnet_shown', { trigger: 'exit_intent' });
      }
    };

    // Optional: Show after 30 seconds as fallback
    const timer = setTimeout(() => {
      if (!hasBeenShown && !isVisible) {
        setIsVisible(true);
        setHasBeenShown(true);
        trackEvent('lead_magnet_shown', { trigger: 'timer_30s' });
      }
    }, 30000);

    if (forceShow) {
      setIsVisible(true);
      setHasBeenShown(true);
    } else {
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasBeenShown, isVisible, forceShow]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('leadMagnetDismissed', 'true');
    trackEvent('lead_magnet_dismissed', {});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Netlify form submission
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'lead-magnet',
          email: String(formData.get('email') || ''),
          name: String(formData.get('name') || ''),
          'bot-field': String(formData.get('bot-field') || ''),
        }).toString(),
      });

      if (res.ok) {
        setStatus('success');
        localStorage.setItem('leadMagnetSubmitted', 'true');
        trackEvent('lead_magnet_submitted', {
          email: String(formData.get('email') || ''),
        });

        // Auto-close after 3 seconds on success
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      } else {
        throw new Error('Network response not ok');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gradient-to-br from-dark-secondary via-dark-secondary to-dark-primary border border-brand-primary/30 rounded-2xl shadow-2xl p-8 animate-slide-up">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-light-secondary hover:text-light-primary transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-primary mb-2">You're all set!</h3>
            <p className="text-light-secondary">
              Check your email for the free AI Tools Cheat Sheet. We'll also send you weekly insights and exclusive
              tips to level up your AI game.
            </p>
          </div>
        ) : (
          <>
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/40 text-xs font-semibold text-brand-primary mb-4">
              🎁 FREE DOWNLOAD
            </div>

            {/* Heading */}
            <h2 className="text-3xl font-extrabold text-light-primary mb-3">
              Before you go...
            </h2>
            <p className="text-lg text-light-secondary mb-6">
              Grab your <strong className="text-light-primary">free AI Tools Cheat Sheet</strong> — 50+ handpicked
              tools, organized by use case, to supercharge your workflow instantly.
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-6">
              {[
                '✅ 50+ curated AI tools (content, design, automation)',
                '✅ Quick-reference format for busy creators',
                '✅ Weekly updates on new tools & workflows',
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-start text-sm text-light-secondary">
                  <span className="mr-2">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Form */}
            <form
              name="lead-magnet"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="form-name" value="lead-magnet" />
              <input type="text" name="bot-field" className="hidden" aria-hidden="true" />

              <div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  className="w-full bg-dark-primary border border-border-dark rounded-lg px-4 py-3 text-light-primary placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full bg-dark-primary border border-border-dark rounded-lg px-4 py-3 text-light-primary placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-brand-primary to-blue-600 text-white font-bold text-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {status === 'submitting' ? 'Sending...' : '🚀 Send me the cheat sheet'}
              </button>
            </form>

            {/* Privacy note */}
            <p className="text-xs text-gray-500 text-center mt-4">
              No spam, ever. Unsubscribe anytime with one click.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadMagnetModal;