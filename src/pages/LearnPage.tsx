import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

// Placeholder URLs - User can update these with their actual links
const SKOOL_URL = import.meta.env.VITE_SKOOL_URL || 'https://skool.com/mikesaiforge';
const YOUTUBE_CHANNEL_URL = import.meta.env.VITE_YOUTUBE_CHANNEL_URL || 'https://youtube.com/@mikesaiforge';

interface CourseCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    duration: string;
    isLive?: boolean;
}

const courses: CourseCard[] = [
    {
        id: '1',
        title: 'AI Foundations for Creators',
        description: 'Learn the basics of AI tools, prompting, and how to integrate AI into your creative workflow.',
        icon: '🚀',
        level: 'Beginner',
        duration: '2 hours',
    },
    {
        id: '2',
        title: 'Automation Masterclass',
        description: 'Master Make.com and Zapier to build powerful automations that save you hours every week.',
        icon: '⚡',
        level: 'Intermediate',
        duration: '4 hours',
    },
    {
        id: '3',
        title: 'Advanced AI Workflows',
        description: 'Build complex multi-step AI workflows for content creation, research, and business operations.',
        icon: '🔥',
        level: 'Advanced',
        duration: '6 hours',
    },
];

interface LearningPath {
    id: string;
    title: string;
    description: string;
    steps: string[];
    color: string;
}

const learningPaths: LearningPath[] = [
    {
        id: 'beginner',
        title: 'Getting Started',
        description: 'New to AI? Start here.',
        steps: ['Try 3 free utilities', 'Watch intro videos', 'Join the community'],
        color: 'from-green-500 to-emerald-600',
    },
    {
        id: 'intermediate',
        title: 'Level Up',
        description: 'Ready for automations.',
        steps: ['Deploy your first workflow', 'Learn Make.com', 'Build content pipelines'],
        color: 'from-blue-500 to-indigo-600',
    },
    {
        id: 'advanced',
        title: 'Go Pro',
        description: 'Build your own systems.',
        steps: ['Custom AI agents', 'Advanced integrations', 'Scale operations'],
        color: 'from-purple-500 to-pink-600',
    },
];

const LearnPage: React.FC = () => {
    const levelColors = {
        Beginner: 'bg-green-500/20 text-green-400',
        Intermediate: 'bg-blue-500/20 text-blue-400',
        Advanced: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <>
            <Seo
                title="Learn AI & Automation | Mike's AI Forge"
                description="Level up your AI skills with courses, tutorials, and a supportive community. From beginner to advanced — learn to automate and work smarter."
                canonicalPath="/learn"
            />
            <div className="space-y-20 animate-fade-in-up">
                {/* Hero Section */}
                <section className="text-center py-12 relative">
                    <div className="absolute inset-0 -top-32 flex items-center justify-center pointer-events-none">
                        <div className="w-[500px] h-[500px] bg-brand-primary/15 rounded-full blur-3xl" />
                    </div>
                    <div className="relative">
                        <span className="inline-block px-4 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-sm font-semibold mb-4">
                            🎓 Learn & Grow
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                            Level Up Your AI Game
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-light-secondary">
                            Courses, tutorials, and a community of builders. Everything you need to master AI tools and automation.
                        </p>
                        <div className="mt-10 flex flex-wrap justify-center gap-4">
                            <a
                                href={SKOOL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Join Skool Community
                            </a>
                            <a
                                href={YOUTUBE_CHANNEL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-red-700 transition-colors text-lg"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Watch on YouTube
                            </a>
                        </div>
                    </div>
                </section>

                {/* Learning Paths */}
                <section>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-light-primary">Choose Your Path</h2>
                        <p className="mt-3 text-light-secondary">Select based on your experience level</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {learningPaths.map((path) => (
                            <div
                                key={path.id}
                                className="relative overflow-hidden bg-dark-secondary border border-border-dark rounded-2xl p-8 hover:border-brand-primary/50 transition-colors"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${path.color}`} />
                                <h3 className="text-2xl font-bold text-light-primary mb-2">{path.title}</h3>
                                <p className="text-light-secondary mb-6">{path.description}</p>
                                <ul className="space-y-3">
                                    {path.steps.map((step, index) => (
                                        <li key={index} className="flex items-center gap-3 text-light-secondary">
                                            <span className={`w-6 h-6 rounded-full bg-gradient-to-r ${path.color} flex items-center justify-center text-white text-xs font-bold`}>
                                                {index + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Featured Courses */}
                <section>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-light-primary">Featured Courses</h2>
                        <p className="mt-3 text-light-secondary">Deep-dive courses available in the Skool community</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <a
                                key={course.id}
                                href={SKOOL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-dark-secondary border border-border-dark rounded-2xl p-6 hover:border-brand-primary/50 transition-all hover:shadow-xl hover:shadow-brand-primary/10"
                            >
                                <div className="text-5xl mb-4">{course.icon}</div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${levelColors[course.level]}`}>
                                        {course.level}
                                    </span>
                                    <span className="text-xs text-light-tertiary">{course.duration}</span>
                                </div>
                                <h3 className="text-xl font-bold text-light-primary group-hover:text-brand-primary transition-colors mb-2">
                                    {course.title}
                                </h3>
                                <p className="text-light-secondary text-sm">{course.description}</p>
                                <div className="mt-4 flex items-center text-brand-primary text-sm font-semibold">
                                    Start Learning
                                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Free Resources */}
                <section className="bg-dark-secondary border border-border-dark rounded-2xl p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-light-primary">Free Resources</h2>
                        <p className="mt-3 text-light-secondary">Start learning without spending a dime</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Link
                            to="/utilities"
                            className="group flex flex-col items-center text-center p-6 rounded-xl bg-dark-primary border border-border-dark hover:border-brand-primary/50 transition-colors"
                        >
                            <div className="text-3xl mb-3">🛠️</div>
                            <h3 className="font-semibold text-light-primary group-hover:text-brand-primary">19+ AI Utilities</h3>
                            <p className="text-sm text-light-secondary mt-1">Free tools for creators</p>
                        </Link>
                        <Link
                            to="/tools"
                            className="group flex flex-col items-center text-center p-6 rounded-xl bg-dark-primary border border-border-dark hover:border-brand-primary/50 transition-colors"
                        >
                            <div className="text-3xl mb-3">⭐</div>
                            <h3 className="font-semibold text-light-primary group-hover:text-brand-primary">Tool Reviews</h3>
                            <p className="text-sm text-light-secondary mt-1">Honest AI tool ratings</p>
                        </Link>
                        <Link
                            to="/workflows"
                            className="group flex flex-col items-center text-center p-6 rounded-xl bg-dark-primary border border-border-dark hover:border-brand-primary/50 transition-colors"
                        >
                            <div className="text-3xl mb-3">⚡</div>
                            <h3 className="font-semibold text-light-primary group-hover:text-brand-primary">Workflow Vault</h3>
                            <p className="text-sm text-light-secondary mt-1">One-click automations</p>
                        </Link>
                        <Link
                            to="/forum"
                            className="group flex flex-col items-center text-center p-6 rounded-xl bg-dark-primary border border-border-dark hover:border-brand-primary/50 transition-colors"
                        >
                            <div className="text-3xl mb-3">💬</div>
                            <h3 className="font-semibold text-light-primary group-hover:text-brand-primary">Community Forum</h3>
                            <p className="text-sm text-light-secondary mt-1">Get help from peers</p>
                        </Link>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="text-center pb-12">
                    <div className="bg-gradient-to-r from-brand-primary/20 via-purple-600/20 to-brand-primary/20 border border-brand-primary/30 rounded-2xl p-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-light-primary mb-4">
                            Ready to Transform Your Workflow?
                        </h2>
                        <p className="text-light-secondary text-lg mb-8 max-w-xl mx-auto">
                            Join thousands of creators learning AI and automation. Get access to exclusive courses, live workshops, and a supportive community.
                        </p>
                        <a
                            href={SKOOL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-brand-primary text-white font-bold px-10 py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg"
                        >
                            Join the Skool Community
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </section>
            </div>
        </>
    );
};

export default LearnPage;
