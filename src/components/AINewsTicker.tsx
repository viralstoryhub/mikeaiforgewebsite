import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// =====================================================
// LIVE AI NEWS TICKER - Stock-ticker style component
// =====================================================

interface NewsItem {
    id: string;
    title: string;
    category: string;
    timestamp: string;
    url?: string;
    slug?: string;
}

// Mock trending news items (in production, fetch from API/Supabase)
const TRENDING_NEWS: NewsItem[] = [
    { id: '1', title: 'OpenAI launches GPT-5 with enhanced reasoning', category: 'LLM', timestamp: '2h ago', slug: 'openai-gpt5' },
    { id: '2', title: 'Google DeepMind unveils Gemini 2.0', category: 'AI', timestamp: '4h ago', slug: 'gemini-2' },
    { id: '3', title: 'Claude 4 breaks benchmark records', category: 'LLM', timestamp: '6h ago', slug: 'claude-4' },
    { id: '4', title: 'Midjourney V7 adds video generation', category: 'Image', timestamp: '8h ago', slug: 'midjourney-v7' },
    { id: '5', title: 'Cursor AI reaches 1M developers', category: 'Tools', timestamp: '12h ago', slug: 'cursor-1m' },
    { id: '6', title: 'Anthropic raises $2B at $30B valuation', category: 'Business', timestamp: '1d ago', slug: 'anthropic-funding' },
    { id: '7', title: 'RunwayML Gen-3 transforms video editing', category: 'Video', timestamp: '1d ago', slug: 'runway-gen3' },
    { id: '8', title: 'Perplexity becomes top search alternative', category: 'Search', timestamp: '2d ago', slug: 'perplexity-rise' },
];

const categoryColors: Record<string, string> = {
    LLM: 'bg-purple-500/20 text-purple-400',
    AI: 'bg-blue-500/20 text-blue-400',
    Image: 'bg-pink-500/20 text-pink-400',
    Video: 'bg-red-500/20 text-red-400',
    Tools: 'bg-green-500/20 text-green-400',
    Business: 'bg-yellow-500/20 text-yellow-400',
    Search: 'bg-cyan-500/20 text-cyan-400',
};

export const AINewsTicker: React.FC = () => {
    const [isPaused, setIsPaused] = useState(false);
    const tickerRef = useRef<HTMLDivElement>(null);

    // Double the items for seamless loop
    const doubledNews = [...TRENDING_NEWS, ...TRENDING_NEWS];

    return (
        <div className="bg-dark-secondary/50 border-y border-border-dark py-2 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-4">
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">AI News</span>
                    </div>

                    {/* Scrolling ticker */}
                    <div
                        className="overflow-hidden flex-1"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                    >
                        <div
                            ref={tickerRef}
                            className={`flex gap-8 animate-ticker ${isPaused ? 'paused' : ''}`}
                            style={{
                                animationPlayState: isPaused ? 'paused' : 'running',
                            }}
                        >
                            {doubledNews.map((item, index) => (
                                <Link
                                    key={`${item.id}-${index}`}
                                    to={`/news/${item.slug || item.id}`}
                                    className="flex items-center gap-2 shrink-0 group"
                                >
                                    <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[item.category] || 'bg-gray-500/20 text-gray-400'}`}>
                                        {item.category}
                                    </span>
                                    <span className="text-sm text-light-primary group-hover:text-brand-primary transition-colors">
                                        {item.title}
                                    </span>
                                    <span className="text-xs text-light-tertiary">{item.timestamp}</span>
                                    <span className="text-light-tertiary">•</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* View all link */}
                    <Link
                        to="/news"
                        className="shrink-0 text-xs text-brand-primary hover:underline"
                    >
                        View All →
                    </Link>
                </div>
            </div>

            {/* Ticker animation styles */}
            <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker.paused {
          animation-play-state: paused;
        }
      `}</style>
        </div>
    );
};

// =====================================================
// TRENDING NOW CARD - For sidebar/homepage
// =====================================================
export const TrendingNow: React.FC<{ limit?: number }> = ({ limit = 5 }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredNews = selectedCategory
        ? TRENDING_NEWS.filter(n => n.category === selectedCategory)
        : TRENDING_NEWS;

    const categories = [...new Set(TRENDING_NEWS.map(n => n.category))];

    return (
        <div className="bg-dark-secondary border border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-light-primary flex items-center gap-2">
                    <span>🔥</span> Trending Now
                </h3>
                <Link to="/news" className="text-xs text-brand-primary hover:underline">
                    See all
                </Link>
            </div>

            {/* Category filter */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`text-xs px-2 py-1 rounded shrink-0 transition-colors ${!selectedCategory ? 'bg-brand-primary text-white' : 'bg-dark-primary text-light-secondary hover:bg-dark-primary/80'
                        }`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-xs px-2 py-1 rounded shrink-0 transition-colors ${selectedCategory === cat ? 'bg-brand-primary text-white' : 'bg-dark-primary text-light-secondary hover:bg-dark-primary/80'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* News list */}
            <div className="space-y-3">
                {filteredNews.slice(0, limit).map((item, index) => (
                    <Link
                        key={item.id}
                        to={`/news/${item.slug || item.id}`}
                        className="flex items-start gap-3 group"
                    >
                        <span className="text-lg text-light-tertiary font-bold">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-light-primary group-hover:text-brand-primary transition-colors line-clamp-2">
                                {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[item.category]}`}>
                                    {item.category}
                                </span>
                                <span className="text-xs text-light-tertiary">{item.timestamp}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AINewsTicker;
