import React, { useState } from 'react';
import { trackEvent } from '../services/analyticsService';
import Seo from '../components/Seo';

const ContactPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Netlify form submission via fetch for SPA
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'contact',
          name: String(formData.get('name') || ''),
          email: String(formData.get('email') || ''),
          message: String(formData.get('message') || ''),
          'bot-field': String(formData.get('bot-field') || ''),
        }).toString(),
      });
      if (res.ok) {
        setStatus('success');
        trackEvent('contact_submit', {
          source: 'contact_page',
        });
        form.reset();
      } else {
        throw new Error('Network response not ok');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <>
      <Seo
        title="Contact Us | Mike's AI Forge"
        description="Have a question, partnership idea, or project? Get in touch with us and we'll get back to you soon."
        canonicalPath="/contact"
      />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-light-primary mb-4">Contact</h1>
        <p className="text-light-secondary mb-8">Have a question, partnership idea, or project? Send a message and Ill get back to you.</p>

        {status === 'success' ? (
          <div className="p-4 rounded-lg border border-green-700/40 bg-green-900/20 text-green-300">
            Thank you! Your message has been sent.
          </div>
        ) : (
          <form
            name="contact"
            method="POST"
            data-netlify="true"
            netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            className="space-y-4 bg-dark-secondary border border-border-dark rounded-xl p-6"
          >
            {/* Netlify form name hidden input */}
            <input type="hidden" name="form-name" value="contact" />
            {/* Honeypot */}
            <input type="text" name="bot-field" className="hidden" aria-hidden="true" />

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-light-secondary mb-1">Name</label>
              <input id="name" name="name" type="text" required className="w-full bg-dark-primary border border-border-dark rounded-md px-3 py-2 text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light-secondary mb-1">Email</label>
              <input id="email" name="email" type="email" required className="w-full bg-dark-primary border border-border-dark rounded-md px-3 py-2 text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-light-secondary mb-1">Message</label>
              <textarea id="message" name="message" required rows={5} className="w-full bg-dark-primary border border-border-dark rounded-md px-3 py-2 text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              data-analytics-event="cta_click"
              data-analytics-props='{"cta":"contact_submit"}'
            >
              {status === 'submitting' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </>
  );
};

export default ContactPage;
