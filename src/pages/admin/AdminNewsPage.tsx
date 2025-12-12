import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NewsArticle } from '../../types';
import * as newsService from '../../services/newsService';
import { useToast } from '../../contexts/ToastContext';

type FeaturedFilter = 'all' | 'featured' | 'notFeatured';
type SortOption = 'publishedAtDesc' | 'publishedAtAsc' | 'titleAsc' | 'titleDesc';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface ArticleFormValues {
  id?: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  publishedAt?: string;
  isFeatured: boolean;
}

const DEFAULT_LIMIT = 10;

const AdminNewsPage: React.FC = () => {
  const { addToast } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('publishedAtDesc');
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>('all');
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [rssSources, setRssSources] = useState('');
  const [rssPreview, setRssPreview] = useState<NewsArticle[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssSyncLoading, setRssSyncLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await newsService.getCategories();
      setCategoryStats(response ?? []);
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to load news categories.', 'error');
    }
  }, [addToast]);

  const normalizePagination = useCallback(
    (incomingMeta: any, fallbackTotal: number): PaginationState => {
      const page = incomingMeta?.page ?? pagination.page ?? 1;
      const limit = incomingMeta?.limit ?? pagination.limit ?? DEFAULT_LIMIT;
      const total = incomingMeta?.total ?? incomingMeta?.count ?? fallbackTotal;
      const totalPages =
        incomingMeta?.totalPages ??
        (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
      return { page, limit, total, totalPages };
    },
    [pagination.limit, pagination.page]
  );

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await newsService.getArticles({
        page: pagination.page,
        limit: pagination.limit,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm.trim() || undefined,
        featured:
          featuredFilter === 'all'
            ? undefined
            : featuredFilter === 'featured'
            ? true
            : false,
        sortBy: sortBy,
      });

      let items: NewsArticle[] = [];
      let meta: any = undefined;
      if (Array.isArray(response)) {
        items = response;
      } else if (response && typeof response === 'object') {
        items = (response as any).items ?? [];
        meta = (response as any).pagination;
      }
      setArticles(items);
      setPagination(normalizePagination(meta, items.length));
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to load news articles.', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    addToast,
    featuredFilter,
    normalizePagination,
    pagination.limit,
    pagination.page,
    searchTerm,
    selectedCategory,
    sortBy,
  ]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchArticles();
    }, 250);

    return () => clearTimeout(debounce);
  }, [fetchArticles]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(event.target.value);
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1,
    }));
  };

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleEditArticle = (article: NewsArticle) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleSaveArticle = async (values: ArticleFormValues) => {
    const payload = {
      title: values.title,
      summary: values.summary,
      content: values.content,
      imageUrl: values.imageUrl || undefined,
      source: values.source,
      sourceUrl: values.sourceUrl,
      category: values.category,
      tags: values.tags,
      publishedAt: values.publishedAt
        ? new Date(values.publishedAt).toISOString()
        : undefined,
      isFeatured: values.isFeatured,
    };

    try {
      if (editingArticle) {
        await newsService.updateArticle(editingArticle.id, payload);
        addToast('Article updated successfully.', 'success');
      } else {
        await newsService.createArticle(payload);
        addToast('Article created successfully.', 'success');
      }
      setIsModalOpen(false);
      await Promise.all([fetchArticles(), fetchCategories()]);
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to save article.', 'error');
    }
  };

  const handleDeleteArticle = async (article: NewsArticle) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the article "${article.title}"?`
      )
    ) {
      return;
    }

    try {
      await newsService.deleteArticle(article.id);
      addToast('Article deleted successfully.', 'success');
      await Promise.all([fetchArticles(), fetchCategories()]);
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to delete article.', 'error');
    }
  };

  const handleToggleFeatured = async (article: NewsArticle) => {
    try {
      await newsService.toggleFeatured(article.id);
      addToast(
        `Article ${
          article.isFeatured ? 'removed from' : 'added to'
        } featured list.`,
        'success'
      );
      await fetchArticles();
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to update featured status.', 'error');
    }
  };

  const handlePreviewFeeds = async () => {
    const previewFn =
      (newsService as any).previewRssFeeds ??
      (newsService as any).previewFeeds ??
      null;

    if (typeof previewFn !== 'function') {
      addToast(
        'RSS preview is not available yet. Please configure the backend integration.',
        'info'
      );
      return;
    }

    const sources = rssSources
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!sources.length) {
      addToast('Please enter at least one RSS feed URL.', 'warning');
      return;
    }

    setRssLoading(true);
    try {
      const previewArticles = await previewFn(sources);
      setRssPreview(previewArticles ?? []);
      addToast('Fetched RSS preview successfully.', 'success');
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to fetch RSS preview.', 'error');
    } finally {
      setRssLoading(false);
    }
  };

  const handleSyncFeeds = async () => {
    const syncFn =
      (newsService as any).syncRssFeeds ??
      (newsService as any).syncFeeds ??
      null;

    if (typeof syncFn !== 'function') {
      addToast(
        'RSS sync is not available yet. Please configure the backend integration.',
        'info'
      );
      return;
    }

    const sources = rssSources
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!sources.length) {
      addToast('Please enter at least one RSS feed URL.', 'warning');
      return;
    }

    setRssSyncLoading(true);
    try {
      const result = await syncFn(sources);
      const added =
        result?.created ??
        result?.inserted ??
        result?.newArticles ??
        result ??
        0;
      addToast(
        `News sync completed. ${added} new article${
          added === 1 ? '' : 's'
        } added.`,
        'success'
      );
      await Promise.all([fetchArticles(), fetchCategories()]);
    } catch (error: any) {
      addToast(error?.message ?? 'Failed to sync news articles.', 'error');
    } finally {
      setRssSyncLoading(false);
    }
  };

  const totalFeatured = useMemo(
    () => articles.filter((article) => article.isFeatured).length,
    [articles]
  );

  const categoryBreakdown = useMemo(() => {
    if (categoryStats.length) {
      return categoryStats;
    }

    const counts = articles.reduce<Record<string, number>>((acc, article) => {
      const key = article.category ?? 'Uncategorized';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));
  }, [articles, categoryStats]);

  const mostViewedArticles = useMemo(() => {
    return [...articles]
      .filter((article) => typeof (article as any).viewCount === 'number')
      .sort(
        (a, b) =>
          (b as any)?.viewCount - ((a as any)?.viewCount ?? 0)
      )
      .slice(0, 5);
  }, [articles]);

  const tableRows = useMemo(() => {
    return articles.map((article) => (
      <tr
        key={article.id}
        className="border-b border-gray-100 last:border-0 dark:border-gray-700"
      >
        <td className="px-6 py-4 align-top">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {article.title}
            </span>
            <span className="text-xs text-gray-500 break-all dark:text-gray-400">
              {article.sourceUrl}
            </span>
            <div className="flex flex-wrap gap-2">
              {article.tags?.slice(0, 4).map((tag) => (
                <span
                  key={`${article.id}-${tag}`}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {article.category || 'Uncategorized'}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {article.source}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleString()
            : '—'}
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              article.isFeatured
                ? 'bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {article.isFeatured ? 'Featured' : 'Standard'}
          </span>
        </td>
        <td className="px-6 py-4 text-right text-sm">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => handleToggleFeatured(article)}
              className="text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-200"
            >
              {article.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              onClick={() => handleEditArticle(article)}
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-200"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteArticle(article)}
              className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-200"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    ));
  }, [articles, handleToggleFeatured]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI News Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Curate, publish, and feature the latest AI news and product updates
            for the community.
          </p>
        </div>
        <button
          onClick={handleCreateArticle}
          className="inline-flex items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 dark:ring-offset-gray-900"
        >
          Create Article
        </button>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Overview
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Articles"
            value={pagination.total}
            subtitle="Across all categories"
          />
          <StatCard
            title="Featured Articles"
            value={totalFeatured}
            subtitle="Highlighted on the news page"
          />
          <StatCard
            title="Latest Publish Date"
            value={
              articles.length
                ? new Date(
                    Math.max(
                      ...articles
                        .filter((item) => item.publishedAt)
                        .map((item) => new Date(item.publishedAt!).getTime())
                    )
                  ).toLocaleString()
                : '—'
            }
            subtitle="Most recent publication"
          />
          <StatCard
            title="Current Page"
            value={`${pagination.page} / ${pagination.totalPages}`}
            subtitle={`${pagination.limit} articles per page`}
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Articles
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage published articles, update their content, and curate featured
            news items.
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="news-search"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Search
              </label>
              <input
                id="news-search"
                value={searchTerm}
                onChange={(event) => {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search by title or source..."
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="news-category-filter"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Category
              </label>
              <select
                id="news-category-filter"
                value={selectedCategory}
                onChange={(event) => {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setSelectedCategory(event.target.value);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="all">All Categories</option>
                {categoryBreakdown.map((category) => (
                  <option key={category.category} value={category.category}>
                    {category.category} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="news-featured-filter"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Featured Status
              </label>
              <select
                id="news-featured-filter"
                value={featuredFilter}
                onChange={(event) => {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setFeaturedFilter(event.target.value as FeaturedFilter);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="featured">Featured</option>
                <option value="notFeatured">Not Featured</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="news-sort"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Sort By
              </label>
              <select
                id="news-sort"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="publishedAtDesc">Publish Date (Newest)</option>
                <option value="publishedAtAsc">Publish Date (Oldest)</option>
                <option value="titleAsc">Title (A → Z)</option>
                <option value="titleDesc">Title (Z → A)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Showing</span>
              <select
                value={pagination.limit}
                onChange={handleLimitChange}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <span>
                • Total {pagination.total} article
                {pagination.total === 1 ? '' : 's'}
              </span>
            </div>
            <button
              onClick={fetchArticles}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Article</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Published</th>
                <th className="px-6 py-3">Featured</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading articles...
                  </td>
                </tr>
              ) : articles.length ? (
                tableRows
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No articles found. Try adjusting your filters or create a new
                    article.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 text-sm dark:border-gray-800">
            <button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Articles by Category
          </h3>
          <div className="mt-4 space-y-3">
            {categoryBreakdown.length ? (
              categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.category}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {((item.count / Math.max(pagination.total, 1)) * 100)
                        .toFixed(1)
                        .replace('.0', '')}
                      % of total articles
                    </p>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No categories available yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Most Viewed Articles
          </h3>
          <div className="mt-4 space-y-3">
            {mostViewedArticles.length ? (
              mostViewedArticles.map((article) => (
                <div
                  key={article.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {article.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{article.category || 'Uncategorized'}</span>
                    <span>
                      {(article as any)?.viewCount ?? 0} view
                      {(article as any)?.viewCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View data will appear once articles receive traffic.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            RSS Feed Automation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure trusted RSS sources to automatically ingest and curate AI
            news. Preview fetched articles before publishing them to ensure
            editorial quality.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="rss-sources"
              className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              RSS Feed URLs
            </label>
            <textarea
              id="rss-sources"
              value={rssSources}
              onChange={(event) => setRssSources(event.target.value)}
              placeholder="Enter one feed URL per line"
              className="h-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Tip: Add feeds from trusted publications like:</span>
              <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800/60">
                VentureBeat
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800/60">
                The Verge
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800/60">
                MIT Technology Review
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={handlePreviewFeeds}
                disabled={rssLoading}
                className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {rssLoading ? 'Fetching Preview...' : 'Preview Articles'}
              </button>
              <button
                onClick={handleSyncFeeds}
                disabled={rssSyncLoading}
                className="inline-flex items-center rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rssSyncLoading ? 'Syncing...' : 'Sync to Database'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Preview
            </h4>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/40">
              {rssPreview.length ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rssPreview.map((preview) => (
                    <li key={preview.slug} className="p-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {preview.title}
                      </p>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {preview.source} •{' '}
                        {preview.publishedAt
                          ? new Date(preview.publishedAt).toLocaleString()
                          : '—'}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3 dark:text-gray-300">
                        {preview.summary || preview.content?.slice(0, 160)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center px-6 py-12 text-sm text-gray-500 dark:text-gray-400">
                  RSS preview articles will appear here after fetching.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <ArticleFormModal
          categories={categoryBreakdown.map((item) => item.category)}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveArticle}
          defaultArticle={editingArticle ?? undefined}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
}> = ({ title, value, subtitle }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {title}
    </p>
    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
      {value}
    </p>
    {subtitle && (
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {subtitle}
      </p>
    )}
  </div>
);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const ArticleFormModal: React.FC<{
  defaultArticle?: NewsArticle;
  categories: string[];
  onClose: () => void;
  onSubmit: (values: ArticleFormValues) => Promise<void>;
}> = ({ defaultArticle, categories, onClose, onSubmit }) => {
  const { addToast } = useToast();
  const [formState, setFormState] = useState<ArticleFormValues>({
    id: defaultArticle?.id,
    title: defaultArticle?.title ?? '',
    summary: defaultArticle?.summary ?? '',
    content: defaultArticle?.content ?? '',
    imageUrl: defaultArticle?.imageUrl ?? '',
    source: defaultArticle?.source ?? '',
    sourceUrl: defaultArticle?.sourceUrl ?? '',
    category: defaultArticle?.category ?? '',
    tags: defaultArticle?.tags ?? [],
    publishedAt: defaultArticle?.publishedAt
      ? new Date(defaultArticle.publishedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    isFeatured: defaultArticle?.isFeatured ?? false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    field: keyof ArticleFormValues,
    value: string | boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.title.trim()) {
      addToast('Title is required.', 'warning');
      return;
    }

    if (!formState.summary.trim()) {
      addToast('Summary is required.', 'warning');
      return;
    }

    if (!formState.content.trim()) {
      addToast('Content is required.', 'warning');
      return;
    }

    if (!formState.source.trim()) {
      addToast('Source name is required.', 'warning');
      return;
    }

    if (!formState.sourceUrl.trim()) {
      addToast('Source URL is required.', 'warning');
      return;
    }

    if (!formState.category.trim()) {
      addToast('Category is required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        ...formState,
        tags: Array.isArray(formState.tags)
          ? formState.tags
          : String(formState.tags)
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tagDisplay = useMemo(
    () => formState.tags.map((tag) => tag.trim()).filter(Boolean).join(', '),
    [formState.tags]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {defaultArticle ? 'Edit Article' : 'Create Article'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Slug: {slugify(formState.title || 'untitled')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gray-100 p-2 text-sm text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-title"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Title
                </label>
                <input
                  id="article-title"
                  value={formState.title}
                  onChange={(event) => handleChange('title', event.target.value)}
                  placeholder="Enter a compelling headline"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-category"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Category
                </label>
                <input
                  id="article-category"
                  list="news-categories"
                  value={formState.category}
                  onChange={(event) =>
                    handleChange('category', event.target.value)
                  }
                  placeholder="Select or type category"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <datalist id="news-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-source"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Source Name
                </label>
                <input
                  id="article-source"
                  value={formState.source}
                  onChange={(event) =>
                    handleChange('source', event.target.value)
                  }
                  placeholder="Publication or platform name"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-source-url"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Source URL
                </label>
                <input
                  id="article-source-url"
                  value={formState.sourceUrl}
                  onChange={(event) =>
                    handleChange('sourceUrl', event.target.value)
                  }
                  placeholder="https://example.com/news"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-2">
                <label
                  htmlFor="article-summary"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Summary
                </label>
                <textarea
                  id="article-summary"
                  value={formState.summary}
                  onChange={(event) =>
                    handleChange('summary', event.target.value)
                  }
                  placeholder="Write a concise summary highlighting the key takeaways..."
                  className="h-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-2">
                <label
                  htmlFor="article-content"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Content
                </label>
                <textarea
                  id="article-content"
                  value={formState.content}
                  onChange={(event) =>
                    handleChange('content', event.target.value)
                  }
                  placeholder="Provide the full article content or curated summary..."
                  className="h-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-image"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Image URL
                </label>
                <input
                  id="article-image"
                  value={formState.imageUrl}
                  onChange={(event) =>
                    handleChange('imageUrl', event.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-published"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Publish Date
                </label>
                <input
                  id="article-published"
                  type="datetime-local"
                  value={formState.publishedAt}
                  onChange={(event) =>
                    handleChange('publishedAt', event.target.value)
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="article-tags"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Tags
                </label>
                <input
                  id="article-tags"
                  value={tagDisplay}
                  onChange={(event) =>
                    handleChange('tags', event.target.value.split(','))
                  }
                  placeholder="Comma-separated tags (e.g. GPT-4, Automation)"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="article-featured"
                  type="checkbox"
                  checked={formState.isFeatured}
                  onChange={(event) =>
                    handleChange('isFeatured', event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary dark:border-gray-600"
                />
                <label
                  htmlFor="article-featured"
                  className="text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Feature this article
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? defaultArticle
                  ? 'Saving...'
                  : 'Publishing...'
                : defaultArticle
                ? 'Save Changes'
                : 'Publish Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNewsPage;
