import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '../contexts/CommandPaletteContext';
import { useData } from '../contexts/DataContext';
import { UTILITIES_DATA } from '../constants';
import * as forumService from '../services/forumService';
import * as newsService from '../services/newsService';
import { SearchIcon } from './icons/UtilityIcons';
import { FilmIcon, SparklesIcon, RocketLaunchIcon } from './icons/ExtraIcons';

interface CommandItem {
  id: string;
  type: 'page' | 'tool' | 'utility' | 'forum-thread' | 'news-article';
  title: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
}

const MAX_DYNAMIC_RESULTS = 6;

type ForumServiceModule = {
  getRecentThreads?: (params?: { limit?: number }) => Promise<any>;
};

type NewsServiceModule = {
  getArticles?: (page?: number, limit?: number, category?: string) => Promise<any>;
  getFeaturedArticles?: () => Promise<any>;
};

const sanitizeToPreview = (input?: string | null, maxLength = 120): string | undefined => {
  if (!input) return undefined;
  const stripped = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return undefined;
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength - 1)}…` : stripped;
};

const extractArray = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && payload.data !== payload) {
    const nestedData = extractArray(payload.data);
    if (nestedData.length) return nestedData;
  }
  if (payload.items && payload.items !== payload) {
    const nestedItems = extractArray(payload.items);
    if (nestedItems.length) return nestedItems;
  }
  if (Array.isArray(payload.results)) return payload.results;
  if (payload.results && payload.results !== payload) {
    const nestedResults = extractArray(payload.results);
    if (nestedResults.length) return nestedResults;
  }
  return [];
};

const CommandPalette: React.FC = () => {
  const { isOpen, close } = useCommandPalette();
  const { tools } = useData();
  const navigate = useNavigate();

  const [isRendered, setIsRendered] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [forumThreadItems, setForumThreadItems] = useState<CommandItem[]>([]);
  const [newsArticleItems, setNewsArticleItems] = useState<CommandItem[]>([]);
  const hasLoadedRemoteDataRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setTimeout(() => setIsRendered(false), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || hasLoadedRemoteDataRef.current) return;

    hasLoadedRemoteDataRef.current = true;

    const fetchDynamicItems = async () => {
      try {
        const forumModule = forumService as ForumServiceModule;
        const newsModule = newsService as NewsServiceModule;

        const threadPromise = forumModule.getRecentThreads
          ? forumModule.getRecentThreads({ limit: MAX_DYNAMIC_RESULTS })
          : Promise.resolve(null);
        const articlePromise = newsModule.getArticles
          ? newsModule.getArticles(1, MAX_DYNAMIC_RESULTS)
          : Promise.resolve(null);

        const [threadsResult, articlesResult] = await Promise.allSettled([threadPromise, articlePromise]);

        if (threadsResult.status === 'fulfilled' && threadsResult.value) {
          const threadPayload = threadsResult.value as any;
          const threadArray = extractArray(
            threadPayload?.threads ?? threadPayload?.data ?? threadPayload?.items ?? threadPayload
          );
          const mappedThreads = threadArray
            .filter((thread: any) => thread && (thread.slug || thread.id))
            .slice(0, MAX_DYNAMIC_RESULTS)
            .map((thread: any): CommandItem | null => {
              const slug = thread.slug ?? (thread.id ? String(thread.id) : null);
              if (!slug) return null;
              return {
                id: `forum-thread-${thread.id ?? slug}`,
                type: 'forum-thread',
                title: thread.title ?? 'Untitled Thread',
                description: sanitizeToPreview(
                  thread.summary ?? thread.excerpt ?? thread.preview ?? thread.content
                ),
                icon: <div className="w-4 h-4 text-gray-400">💬</div>,
                path: `/forum/thread/${slug}`,
              };
            })
            .filter(Boolean) as CommandItem[];

          setForumThreadItems(mappedThreads);
        }

        if (articlesResult.status === 'fulfilled' && articlesResult.value) {
          const articlePayload = articlesResult.value as any;
          const articleArray = extractArray(
            articlePayload?.articles ?? articlePayload?.data ?? articlePayload?.items ?? articlePayload
          );
          const mappedArticles = articleArray
            .filter((article: any) => article && (article.slug || article.id))
            .slice(0, MAX_DYNAMIC_RESULTS)
            .map((article: any): CommandItem | null => {
              const slug = article.slug ?? (article.id ? String(article.id) : null);
              if (!slug) return null;
              return {
                id: `news-article-${article.id ?? slug}`,
                type: 'news-article',
                title: article.title ?? 'Untitled Article',
                description: sanitizeToPreview(article.summary ?? article.excerpt ?? article.content),
                icon: <div className="w-4 h-4 text-gray-400">📰</div>,
                path: `/news/${slug}`,
              };
            })
            .filter(Boolean) as CommandItem[];

          setNewsArticleItems(mappedArticles);
        }
      } catch (error) {
        console.error('Failed to load command palette dynamic content', error);
      }
    };

    void fetchDynamicItems();
  }, [isOpen]);

  const staticPages: CommandItem[] = [
    { id: 'page-home', type: 'page', title: 'Home', path: '/', icon: <div className="w-4 h-4 text-gray-400">🏠</div> },
    { id: 'page-tools', type: 'page', title: 'AI Tools', path: '/tools', icon: <SparklesIcon className="w-4 h-4 text-gray-400" /> },
    { id: 'page-utilities', type: 'page', title: 'Utilities', path: '/utilities', icon: <FilmIcon className="w-4 h-4 text-gray-400" /> },
    { id: 'page-workflows', type: 'page', title: 'Workflows', path: '/workflows', icon: <RocketLaunchIcon className="w-4 h-4 text-gray-400" /> },
    { id: 'page-forum', type: 'page', title: 'Forum', path: '/forum', icon: <div className="w-4 h-4 text-gray-400">💬</div> },
    { id: 'page-news', type: 'page', title: 'AI News', path: '/news', icon: <div className="w-4 h-4 text-gray-400">📰</div> },
    { id: 'page-dashboard', type: 'page', title: 'Dashboard', path: '/dashboard', icon: <div className="w-4 h-4 text-gray-400">👤</div> },
  ];

  const searchItems = useMemo((): CommandItem[] => {
    const toolItems: CommandItem[] = tools.map(tool => ({
      id: `tool-${tool.id}`,
      type: 'tool',
      title: tool.name,
      description: tool.summary,
      icon: <img src={tool.logoUrl} alt={tool.name} className="w-4 h-4 rounded-sm" />,
      path: `/tools/${tool.slug}`,
    }));
    const utilityItems: CommandItem[] = UTILITIES_DATA.map(utility => ({
      id: `utility-${utility.id}`,
      type: 'utility',
      title: utility.name,
      description: utility.description,
      icon: <div className="w-4 h-4 text-gray-400">🛠️</div>,
      path: utility.path,
    }));
    return [
      ...staticPages,
      ...forumThreadItems,
      ...newsArticleItems,
      ...toolItems,
      ...utilityItems,
    ];
  }, [tools, forumThreadItems, newsArticleItems]);

  const filteredItems = useMemo(() => {
    if (!query) return searchItems;
    const lowerQuery = query.toLowerCase();
    return searchItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    );
  }, [query, searchItems]);
  
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = (item: CommandItem) => {
    navigate(item.path);
    close();
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        close();
        return;
      }
      
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredItems[activeIndex]) {
          handleSelect(filteredItems[activeIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredItems]);

  if (!isRendered) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      onClick={close}
      aria-modal="true"
      role="dialog"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`bg-dark-secondary rounded-lg w-full max-w-xl shadow-2xl border border-border-dark overflow-hidden ${isOpen ? 'animate-command-palette-enter' : 'animate-command-palette-leave'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools, utilities, and pages..."
            className="w-full bg-transparent py-4 pl-12 pr-4 text-light-primary outline-none"
          />
        </div>
        <div className="border-t border-border-dark max-h-[60vh] overflow-y-auto">
          {filteredItems.length > 0 ? (
            <ul>
              {filteredItems.map((item, index) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`px-4 py-3 flex items-center space-x-3 cursor-pointer ${
                    activeIndex === index ? 'bg-brand-primary/20' : ''
                  }`}
                  aria-selected={activeIndex === index}
                  role="option"
                >
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-light-primary">{item.title}</p>
                    {item.description && <p className="text-xs text-light-secondary">{item.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-16 text-center text-light-secondary">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
