import React from 'react';

const testimonials = [
  {
    name: 'Alex Chen',
    role: 'Content Creator • 50K Subscribers',
    quote:
      "The Titles Generator alone has boosted my CTR by 40%. Mike's workflows saved me weeks of setup time. I shipped a full content pipeline in one afternoon.",
    avatar: '',
  },
  {
    name: 'Priya Kapoor',
    role: 'Startup Founder • AI SaaS',
    quote:
      'Clear, no-BS tool reviews that actually helped us make decisions fast. We picked our entire AI stack based on Mike\'s recommendations and haven\'t looked back.',
    avatar: '',
  },
  {
    name: 'Jordan Lee',
    role: 'Solo Developer & Creator',
    quote:
      'The free utilities are genuinely underrated. I use the Caption Formatter, Chapters Generator, and Content Repurposer literally every day for my podcast.',
    avatar: '',
  },
  {
    name: 'Sarah Martinez',
    role: 'Digital Marketing Coach',
    quote:
      'My students love the platform. The learning paths make it easy for beginners, and the advanced workflows keep even experts engaged.',
    avatar: '',
  },
  {
    name: 'Marcus Thompson',
    role: 'Agency Owner • 15 Clients',
    quote:
      'Deployed 3 automation workflows for my clients in under an hour. The ROI on this platform is insane. Seriously, just try the utilities.',
    avatar: '',
  },
];

const logos = ['OpenAI', 'Google', 'Notion', 'Zapier', 'Make'];

const Testimonials: React.FC = () => {
  return (
    <section className="relative">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-light-primary sm:text-4xl">Trusted by builders</h2>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-light-secondary">
          Makers and teams use Mike's AI Forge to pick tools, deploy workflows, and ship faster.
        </p>
      </div>

      {/* Logos */}
      <div className="flex flex-wrap items-center justify-center gap-6 opacity-80 mb-10">
        {logos.map((logo) => (
          <div key={logo} className="px-4 py-2 text-sm text-light-tertiary border border-border-dark rounded-md">
            {logo}
          </div>
        ))}
      </div>

      {/* Testimonials grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, idx) => (
          <blockquote key={idx} className="bg-dark-secondary border border-border-dark rounded-xl p-6 h-full">
            <p className="text-light-primary text-lg leading-relaxed">“{t.quote}”</p>
            <footer className="mt-4 flex items-center gap-3 text-sm text-light-secondary">
              <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-light-primary">{t.name}</div>
                <div className="text-light-tertiary">{t.role}</div>
              </div>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

