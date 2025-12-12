import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import newsService from '../services/newsService';
import { NewsArticle } from '../types';
import { Link } from 'react-router-dom';
import NewsCard from '../components/NewsCard';
import Seo from '../components/Seo';

interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NewsCategory {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  articleCount?: number;
}

const DEFAULT_LIMIT = 9;

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));

const ArticleCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-2xl border border-border-dark bg-dark-secondary shadow-lg animate-pulse">
    <div className="relative h-48 w-full bg-gray-800/70" />
    <div className="space-y-4 p-6">
      <div className="h-5 w-32 rounded bg-gray-800/70" />
      <div className="h-6 w-3/4 rounded bg-gray-800/70" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-800/70" />
        <div className="h-4 w-5/6 rounded bg-gray-800/70" />
        <div className="h-4 w-2/3 rounded bg-gray-800/70" />
      </div>
      <div className="h-4 w-1/2 rounded bg-gray-800/70" />
    </div>
  </div>
);

const SidebarSkeleton: React.FC = () => (
  <div className="space-y-6">
    {Array.from({ length: 2 }).map((_, sectionIndex) => (
      <div key={sectionIndex} className="rounded-2xl border border-border-dark bg-dark-secondary p-6 animate-pulse">
        <div className="h-5 w-40 rounded bg-gray-800/70" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((__, itemIndex) => (
            <div key={itemIndex} className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-800/70" />
              <div className="h-3 w-1/2 rounded bg-gray-800/70" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const NewsPage: React.FC = () => {
  const [featuredArticles, setFeaturedArticles] = useState<NewsArticle[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState<boolean>(true);

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

  const [latestArticles, setLatestArticles] = useState<NewsArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<NewsArticle[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [debugInfo, setDebugInfo] = useState<string>('');

  const heroArticles = useMemo(
    () => featuredArticles.slice(0, 3),
    [featuredArticles]
  );

  const hasMore = useMemo(
    () => page < totalPages,
    [page, totalPages]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const normalizeCategories = (raw: unknown): NewsCategory[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as NewsCategory[];
    if (typeof raw === 'object') {
      const maybeObj = raw as Record<string, unknown>;
      if (Array.isArray(maybeObj.categories)) {
        return maybeObj.categories as NewsCategory[];
      }
      if (Array.isArray(maybeObj.items)) {
        return maybeObj.items as NewsCategory[];
      }
    }
    return [];
  };

  const normalizePaginatedResponse = (
    raw: unknown,
    fallbackPage: number,
    fallbackLimit: number
  ): PaginatedResponse<NewsArticle> => {
    if (raw && typeof raw === 'object') {
      const data = raw as Partial<PaginatedResponse<NewsArticle>> &
        Record<string, unknown>;
      if (Array.isArray(data.items)) {
        return {
          items: data.items as NewsArticle[],
          page: typeof data.page === 'number' ? data.page : fallbackPage,
          limit: typeof data.limit === 'number' ? data.limit : fallbackLimit,
          total: typeof data.total === 'number' ? data.total : data.items.length,
          totalPages:
            typeof data.totalPages === 'number'
              ? data.totalPages
              : Math.max(1, Math.ceil(data.total ?? data.items.length / fallbackLimit)),
        };
      }
    }

    return {
      items: Array.isArray(raw) ? (raw as NewsArticle[]) : [],
      page: fallbackPage,
      limit: fallbackLimit,
      total: Array.isArray(raw) ? (raw as NewsArticle[]).length : 0,
      totalPages: 1,
    };
  };

  const logDebug = (message: string, data?: any) => {
    console.log(`[NewsPage] ${message}`, data);
    setDebugInfo(prev => `${prev}\n${message}: ${JSON.stringify(data)}`);
  };

  const fetchArticles = useCallback(
    async (
      {
        page: targetPage,
        append = false,
        category,
        search,
      }: {
        page: number;
        append?: boolean;
        category?: string;
        search?: string;
      }
    ) => {
      setError(null);
      logDebug('Fetching articles', { targetPage, append, category, search });
      
      if (append) {
        setIsFetchingMore(true);
      } else {
        setArticlesLoading(true);
        if (targetPage === 1) {
          setArticles([]);
        }
      }

      const categoryParam =
        category && category !== 'all' ? category : undefined;
      const searchParam = search ? search : undefined;

      try {
        logDebug('Making API request');
        const response = await newsService.getArticles({
          page: targetPage,
          limit: DEFAULT_LIMIT,
          category: categoryParam,
          search: searchParam,
        });

        logDebug('API response received', response);

        if (!response) {
          const errorMsg = 'Failed to fetch articles: no response from server.';
          logDebug(errorMsg);
          setError(errorMsg);
          setArticlesLoading(false);
          setIsFetchingMore(false);
          return;
        }

        const normalized = normalizePaginatedResponse(
          response,
          targetPage,
          DEFAULT_LIMIT
        );

        logDebug('Normalized response', normalized);

        setPage(normalized.page);
        setTotalPages(normalized.totalPages);

        setArticles((prev) =>
          append ? [...prev, ...normalized.items] : normalized.items
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load articles.';
        logDebug('Error fetching articles', { error: message, err });
        setError(message);
      } finally {
        setArticlesLoading(false);
        setIsFetchingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setFeaturedLoading(true);
      try {
        const [featuredResp, categoriesResp] = await Promise.all([
          newsService.getArticles({ featured: true, limit: 3 }),
          newsService.getCategories(),
        ]);

        if (!isMounted) return;

        const normalizedFeatured = Array.isArray(featuredResp)
          ? featuredResp
          : (featuredResp as { items?: NewsArticle[] })?.items ?? [];

        const normalizedCategories = normalizeCategories(categoriesResp);

        setFeaturedArticles(normalizedFeatured);
        setCategories([
          { slug: 'all', name: 'All' },
          ...normalizedCategories,
        ]);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load featured articles and categories.';
        setError(message);
      } finally {
        if (isMounted) {
          setFeaturedLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSidebarData = async () => {
      setSidebarLoading(true);
      try {
        const [latestResp, popularResp] = await Promise.allSettled([
          newsService.getArticles({
            page: 1,
            limit: 5,
            sortBy: 'publishedAt',
          }),
          newsService.getArticles({
            page: 1,
            limit: 5,
            sortBy: 'views',
            timeframe: '7d',
          }),
        ]);

        if (!isMounted) return;

        if (latestResp.status === 'fulfilled') {
          const normalizedLatest = normalizePaginatedResponse(
            latestResp.value,
            1,
            5
          );
          setLatestArticles(normalizedLatest.items);
        }

        if (popularResp.status === 'fulfilled') {
          const normalizedPopular = normalizePaginatedResponse(
            popularResp.value,
            1,
            5
          );
          setPopularArticles(normalizedPopular.items);
        }
      } catch {
        /* Sidebar data is optional; errors handled silently */
      } finally {
        if (isMounted) {
          setSidebarLoading(false);
        }
      }
    };

    loadSidebarData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchArticles({
      page: 1,
      category: activeCategory,
      search: debouncedSearch,
    });
  }, [activeCategory, debouncedSearch, fetchArticles]);

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore) {
      fetchArticles({
        page: page + 1,
        append: true,
        category: activeCategory,
        search: debouncedSearch,
      });
    }
  };

  const activeCategoryLabel = useMemo(() => {
    if (activeCategory === 'all') {
      return 'All';
    }
    return (
      categories.find((cat) => cat.slug === activeCategory)?.name ??
      'All'
    );
  }, [activeCategory, categories]);

  // Add debug panel in development
  return (
    <>
      <Seo
        title="AI News Hub | Latest AI Tools, Trends & Breakthroughs"
        description="Stay ahead with curated AI breakthroughs, product launches, and expert insights. Explore the latest in AI tools, industry moves, and hands-on tutorials."
        canonicalPath="/news"
      />
      <div className="space-y-16 md:space-y-24">
        {/* Debug Panel - Remove in production */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 max-w-md max-h-96 overflow-auto bg-black/90 text-white p-4 rounded-lg text-xs z-50">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            <button
              onClick={() => setDebugInfo('')}
              className="mt-2 px-2 py-1 bg-red-500 rounded text-white"
            >
              Clear
            </button>
          </div>
        )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border-dark bg-gradient-to-br from-dark-secondary via-dark-secondary to-black/80 px-6 py-16 md:px-12 md:py-24">
        <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-brand-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-brand-primary/40 bg-brand-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-primary">
              AI News Hub
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-light-primary md:text-6xl">
              Stay ahead with curated AI breakthroughs, product launches, and expert insights.
            </h1>
            <p className="mt-6 text-lg text-light-secondary md:text-xl">
              Explore the latest in AI tools, industry moves, and hands-on tutorials—all in one place.
            </p>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          ) : heroArticles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {heroArticles.map((article, index) => (
                <NewsCard
                  key={article.id ?? `${article.slug}-${index}`}
                  article={article}
                  featured
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-dark bg-dark-secondary/60 p-8 text-light-secondary">
              No featured articles available yet. Check back soon!
            </div>
          )}
        </div>
      </section>

      {/* Controls */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => setActiveCategory(category.slug)}
              className={`group relative overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeCategory === category.slug
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/40'
                  : 'border border-border-dark bg-dark-secondary text-light-secondary hover:border-brand-primary/40 hover:text-light-primary'
              }`}
            >
              <span className="relative z-10">
                {category.name}
                {category.slug !== 'all' && typeof category.articleCount === 'number' ? (
                  <span className="ml-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-gray-300">
                    {category.articleCount}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-light-primary">
              {activeCategoryLabel === 'All'
                ? 'All Articles'
                : activeCategoryLabel}
            </h2>
            <p className="mt-1 text-sm text-light-secondary">
              Discover the latest stories, curated insights, and in-depth guides.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search articles..."
              className="w-full rounded-full border border-border-dark bg-dark-secondary px-5 py-3 pl-11 text-sm text-light-primary placeholder:text-gray-500 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-12 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-300">
              {error}
            </div>
          ) : null}

          {articlesLoading && articles.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {articles.map((article, index) => (
                  <NewsCard
                    key={article.id ?? `${article.slug}-${index}`}
                    article={article}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isFetchingMore}
                    className="inline-flex items-center rounded-full border border-border-dark bg-dark-secondary px-6 py-3 text-sm font-semibold text-light-primary transition hover:border-brand-primary/40 hover:bg-dark-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFetchingMore && (
                      <svg
                        className="mr-2 h-4 w-4 animate-spin text-brand-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    )}
                    {isFetchingMore ? 'Loading…' : 'Load more articles'}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-border-dark bg-dark-secondary p-10 text-center text-light-secondary">
              <h3 className="text-xl font-semibold text-light-primary">
                No articles found
              </h3>
              <p className="mt-2 text-sm text-light-secondary">
                Try adjusting your filters or check back later for new updates.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-8">
          {sidebarLoading ? (
            <SidebarSkeleton />
          ) : (
            <>
              <div className="rounded-2xl border border-border-dark bg-dark-secondary p-6">
                <h3 className="text-lg font-semibold text-light-primary">
                  Latest Updates
                </h3>
                <p className="mt-1 text-sm text-light-secondary">
                  Fresh stories straight from the AI frontier.
                </p>
                <div className="mt-5 space-y-4">
                  {latestArticles.length === 0 ? (
                    <p className="text-sm text-light-secondary">
                      No recent updates to display.
                    </p>
                  ) : (
                    latestArticles.map((article) => (
                      <Link
                        key={article.id ?? article.slug}
                        to={`/news/${article.slug}`}
                        className="group block rounded-xl border border-transparent bg-dark-secondary/40 px-4 py-3 transition hover:border-brand-primary/40 hover:bg-dark-secondary/80"
                      >
                        <p className="text-sm font-semibold text-light-primary line-clamp-2 group-hover:text-brand-primary">
                          {article.title}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-brand-primary">
                          {article.category}
                        </p>
                        <p className="text-xs text-light-secondary">
                          {article.publishedAt ? formatDate(article.publishedAt) : ''}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border-dark bg-dark-secondary p-6">
                <h3 className="text-lg font-semibold text-light-primary">
                  Popular This Week
                </h3>
                <p className="mt-1 text-sm text-light-secondary">
                  Stories trending across the community.
                </p>
                <div className="mt-5 space-y-4">
                  {popularArticles.length === 0 ? (
                    <p className="text-sm text-light-secondary">
                      Popular articles will appear here soon.
                    </p>
                  ) : (
                    popularArticles.map((article) => (
                      <Link
                        key={article.id ?? article.slug}
                        to={`/news/${article.slug}`}
                        className="group flex items-start gap-3 rounded-xl border border-transparent bg-dark-secondary/40 px-4 py-3 transition hover:border-brand-primary/40 hover:bg-dark-secondary/80"
                      >
                        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-brand-primary/10 text-center text-xs font-semibold leading-8 text-brand-primary">
                          #{popularArticles.indexOf(article) + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-light-primary line-clamp-2 group-hover:text-brand-primary">
                            {article.title}
                          </p>
                          <p className="text-xs text-light-secondary">
                            {article.publishedAt ? formatDate(article.publishedAt) : ''}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/15 via-dark-secondary to-dark-secondary p-6">
                <h3 className="text-lg font-semibold text-light-primary">
                  Subscribe to the newsletter
                </h3>
                <p className="mt-2 text-sm text-light-secondary">
                  Weekly digest of standout AI tools, workflows, and breakthroughs.
                </p>
                <form className="mt-6 space-y-3">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-full border border-border-dark bg-black/40 px-5 py-3 text-sm text-light-primary placeholder:text-gray-500 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  />
                  <button
                    type="button"
                    className="w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="mt-3 text-xs text-light-secondary">
                  No spam. Just curated intelligence for builders and creators.
                </p>
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
    </>
  );
};

export default NewsPage;