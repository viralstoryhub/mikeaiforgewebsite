import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const YOUTUBE_CHANNEL_URL = import.meta.env.VITE_YOUTUBE_CHANNEL_URL || 'https://youtube.com/@mikesaiforge';

interface VideoItem {
    id: string;
    title: string;
    description: string;
    youtubeId: string;
    category: string;
    duration: string;
    relatedUtility?: string;
    relatedUtilityPath?: string;
}

// Placeholder videos - User should update with their actual YouTube video IDs
const videos: VideoItem[] = [
    {
        id: '1',
        title: 'Getting Started with AI Automation',
        description: 'Learn the fundamentals of AI automation and how to set up your first workflow.',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Getting Started',
        duration: '12:34',
        relatedUtility: 'AI Chat Assistant',
        relatedUtilityPath: '/chat',
    },
    {
        id: '2',
        title: 'How to Generate Click-Worthy Titles',
        description: 'Master the art of title creation using AI to maximize your content engagement.',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Tutorials',
        duration: '8:45',
        relatedUtility: 'Titles/Hooks Generator',
        relatedUtilityPath: '/utilities/titles-hooks-generator',
    },
    {
        id: '3',
        title: 'Make.com Automation Masterclass',
        description: 'Complete guide to building powerful automations with Make.com.',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Automation',
        duration: '45:20',
    },
    {
        id: '4',
        title: 'AI Thumbnail Design Secrets',
        description: 'Create thumbnails that stop the scroll using AI-powered tools and techniques.',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Tutorials',
        duration: '15:22',
        relatedUtility: 'Thumbnail Generator',
        relatedUtilityPath: '/utilities/thumbnail-generator',
    },
    {
        id: '5',
        title: 'Content Repurposing Workflow',
        description: 'Turn one piece of content into 10+ formats using AI automation.',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Automation',
        duration: '22:15',
        relatedUtility: 'Content Repurposer',
        relatedUtilityPath: '/utilities/content-repurposer',
    },
    {
        id: '6',
        title: 'Gemini 2.5 Flash Review',
        description: 'Honest review of Google Gemini 2.5 Flash - is it worth using?',
        youtubeId: 'dQw4w9WgXcQ', // Placeholder - Replace with actual video ID
        category: 'Tool Reviews',
        duration: '18:30',
    },
];

const categories = ['All', 'Getting Started', 'Tutorials', 'Automation', 'Tool Reviews'];

const YouTubePage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredVideos = activeCategory === 'All'
        ? videos
        : videos.filter(v => v.category === activeCategory);

    return (
        <>
            <Seo
                title="YouTube Videos | Mike's AI Forge"
                description="Watch tutorials, tool reviews, and automation guides. Learn AI and automation from practical, no-fluff videos."
                canonicalPath="/youtube"
            />
            <div className="space-y-16 animate-fade-in-up">
                {/* Hero Section */}
                <section className="text-center py-12 relative">
                    <div className="absolute inset-0 -top-32 flex items-center justify-center pointer-events-none">
                        <div className="w-[400px] h-[400px] bg-red-600/20 rounded-full blur-3xl" />
                    </div>
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/20 text-red-400 text-sm font-semibold mb-6">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            YouTube Channel
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-light-primary">
                            Learn From Video Tutorials
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-light-secondary">
                            No-fluff tutorials, honest tool reviews, and step-by-step automation guides. Learn at your own pace.
                        </p>
                        <div className="mt-8">
                            <a
                                href={YOUTUBE_CHANNEL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-red-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-red-700 transition-colors text-lg"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Subscribe on YouTube
                                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">Free</span>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Category Filter */}
                <section>
                    <div className="flex flex-wrap justify-center gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === category
                                        ? 'bg-brand-primary text-white'
                                        : 'bg-dark-secondary text-light-secondary border border-border-dark hover:border-brand-primary/50'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Video Grid */}
                <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map((video) => (
                            <div
                                key={video.id}
                                className="group bg-dark-secondary border border-border-dark rounded-2xl overflow-hidden hover:border-brand-primary/50 transition-all"
                            >
                                {/* Video Thumbnail */}
                                <a
                                    href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative block aspect-video bg-dark-primary"
                                >
                                    <img
                                        src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                                        alt={video.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                        {video.duration}
                                    </span>
                                </a>

                                {/* Video Info */}
                                <div className="p-5">
                                    <span className="text-xs text-brand-primary font-semibold uppercase tracking-wide">
                                        {video.category}
                                    </span>
                                    <h3 className="mt-2 text-lg font-bold text-light-primary group-hover:text-brand-primary transition-colors line-clamp-2">
                                        <a
                                            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {video.title}
                                        </a>
                                    </h3>
                                    <p className="mt-2 text-sm text-light-secondary line-clamp-2">
                                        {video.description}
                                    </p>

                                    {/* Related Utility */}
                                    {video.relatedUtility && video.relatedUtilityPath && (
                                        <Link
                                            to={video.relatedUtilityPath}
                                            className="mt-4 inline-flex items-center gap-2 text-sm text-brand-primary hover:underline"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Try {video.relatedUtility}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* View More CTA */}
                <section className="text-center">
                    <div className="bg-dark-secondary border border-border-dark rounded-2xl p-10">
                        <h2 className="text-2xl font-bold text-light-primary mb-4">Want More Content?</h2>
                        <p className="text-light-secondary mb-6 max-w-lg mx-auto">
                            Subscribe to the YouTube channel for weekly tutorials, tool reviews, and automation guides.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href={YOUTUBE_CHANNEL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Subscribe for Free
                            </a>
                            <Link
                                to="/learn"
                                className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                View Courses
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default YouTubePage;
