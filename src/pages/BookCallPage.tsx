import React, { useEffect } from 'react';
import Seo from '../components/Seo';

const calendlyUrl = import.meta.env.VITE_CALENDLY_URL as string | undefined;

const BookCallPage: React.FC = () => {
  useEffect(() => {
    if (!calendlyUrl) return;
    const id = 'calendly-inline-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    document.body.appendChild(s);
  }, []);

  if (!calendlyUrl) {
    return (
      <>
        <Seo
          title="Book a Call | Mike's AI Forge"
          description="Schedule a consultation to discuss your AI automation needs, workflows, and how we can help accelerate your business."
          canonicalPath="/book"
        />
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-light-primary mb-4">Book a call</h1>
          <p className="text-light-secondary">My booking link isnt configured yet. Please use the contact form instead.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Book a Call | Mike's AI Forge"
        description="Schedule a consultation to discuss your AI automation needs, workflows, and how we can help accelerate your business."
        canonicalPath="/book"
      />
      <div>
        <h1 className="text-3xl font-bold text-light-primary mb-4">Book a call</h1>
        <div className="calendly-inline-widget" data-url={calendlyUrl} style={{ minWidth: '320px', height: '700px' }} />
      </div>
    </>
  );
};

export default BookCallPage;
