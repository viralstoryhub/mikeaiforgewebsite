import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const AboutPage: React.FC = () => {
    return (
        <>
            <Seo
                title="About Mike | Mike's AI Forge"
                description="Meet Mike — the creator behind Mike's AI Forge. Learn about his journey helping creators and entrepreneurs leverage AI tools and automation."
                canonicalPath="/about"
            />
            <div className="max-w-4xl mx-auto space-y-16 animate-fade-in-up">
                {/* Hero Section */}
                <section className="text-center py-12">
                    <div className="relative inline-block mb-8">
                        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 p-1">
                            <div className="w-full h-full rounded-full bg-dark-secondary flex items-center justify-center">
                                <span className="text-5xl font-bold text-brand-primary">M</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                            Creator
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-light-primary">
                        Hey, I'm Mike 👋
                    </h1>
                    <p className="mt-4 text-xl text-light-secondary max-w-2xl mx-auto">
                        I help creators and entrepreneurs leverage AI tools and automation to 10x their productivity.
                    </p>
                </section>

                {/* My Story */}
                <section className="bg-dark-secondary border border-border-dark rounded-2xl p-8 md:p-12">
                    <h2 className="text-2xl md:text-3xl font-bold text-light-primary mb-6">My Story</h2>
                    <div className="space-y-4 text-light-secondary text-lg leading-relaxed">
                        <p>
                            I've spent years testing every AI tool, automation platform, and workflow hack I could get my hands on.
                            What started as personal curiosity became a mission: <span className="text-light-primary font-semibold">helping others cut through the noise and find what actually works.</span>
                        </p>
                        <p>
                            On my YouTube channel, I share honest reviews, step-by-step tutorials, and the exact workflows I use to
                            save hours every week. No fluff, no sponsored garbage — just real tools that make a real difference.
                        </p>
                        <p>
                            Mike's AI Forge is where all of that comes together. It's your hub for <span className="text-brand-primary font-semibold">battle-tested AI tools</span>,
                            <span className="text-brand-primary font-semibold"> one-click automations</span>, and a community of builders who are serious about working smarter.
                        </p>
                    </div>
                </section>

                {/* What I Believe */}
                <section>
                    <h2 className="text-2xl md:text-3xl font-bold text-light-primary mb-8 text-center">What I Believe</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-dark-secondary border border-border-dark rounded-xl p-6 text-center">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-lg font-bold text-light-primary mb-2">Tools Should Work</h3>
                            <p className="text-light-secondary text-sm">
                                I only recommend tools I've personally tested and use regularly. No affiliate garbage.
                            </p>
                        </div>
                        <div className="bg-dark-secondary border border-border-dark rounded-xl p-6 text-center">
                            <div className="text-4xl mb-4">⚡</div>
                            <h3 className="text-lg font-bold text-light-primary mb-2">Speed Matters</h3>
                            <p className="text-light-secondary text-sm">
                                Automation isn't about being lazy — it's about focusing on what actually matters.
                            </p>
                        </div>
                        <div className="bg-dark-secondary border border-border-dark rounded-xl p-6 text-center">
                            <div className="text-4xl mb-4">🤝</div>
                            <h3 className="text-lg font-bold text-light-primary mb-2">Community Wins</h3>
                            <p className="text-light-secondary text-sm">
                                The best insights come from real practitioners sharing what works for them.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Connect With Me */}
                <section className="bg-gradient-to-r from-brand-primary/20 to-purple-600/20 border border-brand-primary/30 rounded-2xl p-8 md:p-12 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-light-primary mb-4">Let's Connect</h2>
                    <p className="text-light-secondary text-lg mb-8 max-w-xl mx-auto">
                        Want to learn more? Check out my YouTube channel, join the community, or book a call.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="https://youtube.com/@mikesaiforge"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            YouTube
                        </a>
                        <Link
                            to="/learn"
                            className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Join Courses
                        </Link>
                        <Link
                            to="/book"
                            className="inline-flex items-center gap-2 bg-dark-secondary text-light-primary font-semibold px-6 py-3 rounded-lg border border-border-dark hover:border-brand-primary transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Book a Call
                        </Link>
                    </div>
                </section>

                {/* Quick Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-brand-primary">19+</div>
                        <div className="text-sm text-light-secondary mt-1">Free AI Utilities</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-brand-primary">6+</div>
                        <div className="text-sm text-light-secondary mt-1">Tested AI Tools</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-brand-primary">4+</div>
                        <div className="text-sm text-light-secondary mt-1">Ready Workflows</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-brand-primary">∞</div>
                        <div className="text-sm text-light-secondary mt-1">Hours Saved</div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AboutPage;
