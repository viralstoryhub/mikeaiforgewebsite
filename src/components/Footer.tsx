
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';

const Footer: React.FC = () => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  return (
    <>
      {isFeedbackModalOpen && (
        <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
      )}
      <footer className="bg-dark-primary border-t border-border-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-light-secondary">
          <p>&copy; {new Date().getFullYear()} Mike's AI Forge. All rights reserved.</p>
          <p className="text-sm mt-1 opacity-75">Empowering creators with breakthrough tools, vibrant community discussions, and the latest AI news.</p>
          <nav className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
            <Link to="/learn" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              Learn
            </Link>
            <Link to="/utilities" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              Utilities
            </Link>
            <Link to="/forum" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              Community
            </Link>
            <Link to="/youtube" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              YouTube
            </Link>
            <Link to="/about" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              About Mike
            </Link>
            <Link to="/contact" className="text-light-secondary hover:text-brand-primary hover:underline transition-colors">
              Contact
            </Link>
          </nav>

          {/* Newsletter signup (Netlify Forms) */}
          <form
            name="newsletter"
            method="POST"
            data-netlify="true"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement | null;
              const email = emailInput?.value || '';
              try {
                const res = await fetch('/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ 'form-name': 'newsletter', email }).toString(),
                });
                if (res.ok) {
                  if (emailInput) emailInput.value = '';
                }
              } catch (err) {
                console.error('Newsletter signup failed', err);
              }
            }}
            className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-2"
          >
            <input type="hidden" name="form-name" value="newsletter" />
            <input
              type="email"
              name="email"
              required
              placeholder="Your email"
              className="w-full sm:w-72 bg-dark-secondary border border-border-dark rounded-md px-3 py-2 text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-brand-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              data-analytics-event="cta_click"
              data-analytics-props='{"cta":"newsletter_subscribe_footer"}'
            >
              Subscribe
            </button>
          </form>

          <div className="mt-4">
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="text-sm text-light-secondary hover:text-brand-primary hover:underline"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
