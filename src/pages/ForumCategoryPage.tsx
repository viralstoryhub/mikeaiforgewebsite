import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import * as forumService from '../services/forumService';

const THREADS_PER_PAGE = 20;

type SortOption = 'latest' | 'mostViewed' | 'newest' | 'mostReplies';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  threadCount?: number | null;
  postCount?: number | null;
  lastActivityAt?: string | null;
}

interface ThreadAuthor {
  id: string;
  name?: string | null;
  username?: string | null;
  profilePictureUrl?: string | null;
  title?: string | null;
}

interface ForumThread {
  id: string;
  title: string;
  slug: string;
  isPinned?: boolean | null;
  isLocked?: boolean | null;
  replyCount?: number | null;
  viewCount?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  lastActivityAt?: string | null;
  postCount?: number | null;
  excerpt?: string | null;
  author?: ThreadAuthor | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryThreadsResponse {
  category?: ForumCategory | null;
  threads: ForumThread[];
  pagination?: Partial<PaginationMeta> | null;
  totalThreads?: number | null;
}

interface CreateThreadPayload {
  title: string;
  content: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: 'Latest Activity' },
  { value: 'mostViewed', label: 'Most Viewed' },
  { value: 'newest', label: 'Newest' },
  { value: 'mostReplies', label: 'Most Replies' },
];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const maybeAxiosError = error as {
      message?: string;
      response?: { data?: { message?: string; error?: string } };
    };
    if (maybeAxiosError.response?.data?.message) {
      return maybeAxiosError.response.data.message;
    }
    if (maybeAxiosError.response?.data?.error) {
      return maybeAxiosError.response.data.error;
    }
    if (maybeAxiosError.message) {
      return maybeAxiosError.message;
    }
  }
  return 'Something went wrong. Please try again.';
};

const formatRelativeTime = (dateInput?: string | null): string => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';

  const now = Date.now();
  const diffInSeconds = Math.round((date.getTime() - now) / 1000);

  const thresholds: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2629800, divisor: 604800, unit: 'week' },
    { limit: 31557600, divisor: 2629800, unit: 'month' },
    { limit: Number.POSITIVE_INFINITY, divisor: 31557600, unit: 'year' },
  ];

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  for (const { limit, divisor, unit } of thresholds) {
    if (Math.abs(diffInSeconds) < limit) {
      const value = Math.round(diffInSeconds / divisor);
      return rtf.format(value, unit);
    }
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatDate = (dateInput?: string | null): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
};

const normalizePagination = (
  pagination?: Partial<PaginationMeta> | null,
  fallbackTotal = 0,
  fallbackPage = 1,
): PaginationMeta => {
  const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : THREADS_PER_PAGE;
  const total = typeof pagination?.total === 'number' ? pagination.total : fallbackTotal;
  const page = typeof pagination?.page === 'number' ? pagination.page : fallbackPage;
  const totalPages =
    typeof pagination?.totalPages === 'number' && pagination.totalPages > 0
      ? pagination.totalPages
      : Math.max(1, Math.ceil((total || 1) / limit));
  return { page, limit, total, totalPages };
};

const ForumCategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: THREADS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousTitle = document.title;
    document.title = category?.name
      ? `${category.name} • Community Forum`
      : 'Community Forum • Mike’s AI Forge';
    return () => {
      document.title = previousTitle;
    };
  }, [category?.name]);

  useEffect(() => {
    setCurrentPage(1);
    setSortBy('latest');
  }, [categorySlug]);

  useEffect(() => {
    if (!categorySlug) {
      setCategory(null);
      setThreads([]);
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);
    setError(null);

    const fetchThreads = async () => {
      try {
        const response: CategoryThreadsResponse = await forumService.getThreadsByCategory(
          categorySlug,
          currentPage,
          THREADS_PER_PAGE,
          sortBy,
        );

        if (!isActive) return;

        const fallbackTotal =
          response.totalThreads ??
          response.category?.threadCount ??
          response.threads?.length ??
          0;

        setCategory(response.category ?? null);
        setThreads(response.threads ?? []);
        setPagination(normalizePagination(response.pagination, fallbackTotal, currentPage));
      } catch (err) {
        if (!isActive) return;
        setError(getErrorMessage(err));
        setCategory((prev) => prev ?? null);
        setThreads([]);
        setPagination({
          page: currentPage,
          limit: THREADS_PER_PAGE,
          total: 0,
          totalPages: 1,
        });
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchThreads();

    return () => {
      isActive = false;
    };
  }, [categorySlug, currentPage, sortBy, refreshToken]);

  const pinnedThreads = useMemo(
    () => threads.filter((thread) => thread.isPinned),
    [threads],
  );

  const regularThreads = useMemo(
    () => threads.filter((thread) => !thread.isPinned),
    [threads],
  );

  const hasThreads = pinnedThreads.length > 0 || regularThreads.length > 0;
  const showEmptyState = !loading && !error && !hasThreads;
  const totalThreadCount =
    typeof category?.threadCount === 'number' && category.threadCount >= 0
      ? category.threadCount
      : pagination.total;
  const totalPostCount =
    typeof category?.postCount === 'number' && category.postCount >= 0
      ? category.postCount
      : 0;

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as SortOption);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRetry = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const handleNewThreadClick = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/forum/${categorySlug ?? ''}` } });
      return;
    }
    setIsComposerOpen(true);
  };

  const handleThreadCreation = async ({ title, content }: CreateThreadPayload) => {
    if (!categorySlug) {
      throw new Error('Invalid category. Please refresh the page.');
    }

    const createdThread: ForumThread | { thread?: ForumThread } =
      await forumService.createThread(categorySlug, { title, content });

    let createdSlug: string | undefined;

    if (createdThread && typeof createdThread === 'object' && 'slug' in createdThread && typeof (createdThread as any).slug === 'string') {
      createdSlug = (createdThread as any).slug;
    } else if (
      createdThread &&
      typeof createdThread === 'object' &&
      'thread' in createdThread &&
      createdThread.thread &&
      typeof createdThread.thread === 'object' &&
      'slug' in createdThread.thread &&
      typeof (createdThread.thread as any).slug === 'string'
    ) {
      createdSlug = (createdThread.thread as any).slug;
    }

    setIsComposerOpen(false);
    setCurrentPage(1);
    setSortBy('latest');
    setRefreshToken((prev) => prev + 1);

    if (createdSlug) {
      navigate(`/forum/thread/${createdSlug}`);
    }
  };

  if (!categorySlug) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-semibold text-light-primary">Category not found</h1>
        <p className="mt-3 max-w-xl text-base text-light-secondary">
          We couldn’t determine which forum category you were trying to view. Please return to the
          community hub and choose a category.
        </p>
        <Link
          to="/forum"
          className="mt-6 inline-flex items-center rounded-full bg-brand-primary px-6 py-3 font-semibold text-white shadow-lg shadow-brand-primary/30 transition-transform hover:-translate-y-0.5 hover:shadow-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-primary"
        >
          Back to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-primary/90 via-dark-primary/80 to-dark-primary/90 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header className="rounded-3xl border border-border-dark/60 bg-dark-secondary/60 p-6 shadow-2xl shadow-dark-primary/40 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <nav className="flex items-center gap-2 text-sm text-light-secondary">
                <Link
                  to="/forum"
                  className="font-semibold text-light-secondary transition-colors hover:text-brand-primary"
                >
                  Forum
                </Link>
                <span className="text-light-secondary/60">/</span>
                <span className="text-light-primary">
                  {category?.name ?? (loading ? 'Loading…' : 'Unknown Category')}
                </span>
              </nav>

              <div className="mt-4 flex items-center gap-3">
                {category?.icon ? (
                  <span className="text-3xl md:text-4xl">{category.icon}</span>
                ) : (
                  <span className="text-3xl md:text-4xl">💬</span>
                )}
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-light-primary md:text-4xl">
                    {category?.name ?? 'Community Discussions'}
                  </h1>
                  <p className="mt-2 max-w-2xl text-base text-light-secondary md:text-lg">
                    {category?.description ??
                      'Explore conversations from creators, founders, and AI enthusiasts.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-light-secondary">
                <span className="inline-flex items-center gap-2 rounded-full bg-dark-primary/60 px-4 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-primary" />
                  <strong className="font-semibold text-light-primary">
                    {totalThreadCount.toLocaleString()}
                  </strong>
                  Threads
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-dark-primary/60 px-4 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <strong className="font-semibold text-light-primary">
                    {totalPostCount.toLocaleString()}
                  </strong>
                  Posts
                </span>
                {category?.lastActivityAt && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-dark-primary/60 px-4 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Last activity {formatRelativeTime(category.lastActivityAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <select
                value={sortBy}
                onChange={handleSortChange}
                disabled={loading}
                className="w-full rounded-full border border-border-dark/60 bg-dark-primary px-5 py-3 text-sm font-semibold text-light-primary shadow-inner shadow-dark-primary/40 transition focus:outline-none focus:ring-2 focus:ring-brand-primary/60 md:w-52"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNewThreadClick}
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-secondary"
              >
                {currentUser ? 'New Thread' : 'Sign in to Post'}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-6 py-5 text-rose-100 shadow-lg shadow-rose-900/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base font-medium">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center rounded-full border border-rose-400/60 px-5 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-dark-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-border-dark/60 bg-dark-secondary/60 p-4 shadow-2xl shadow-dark-primary/40 backdrop-blur sm:p-6 lg:p-8">
          <div className="hidden grid-cols-[minmax(0,1.8fr)_1.4fr_0.8fr_0.8fr_1fr] gap-4 border-b border-border-dark/60 pb-4 text-sm font-semibold uppercase tracking-wide text-light-secondary/80 md:grid">
            <span>Discussion</span>
            <span>Author</span>
            <span className="text-center">Replies</span>
            <span className="text-center">Views</span>
            <span>Last Activity</span>
          </div>

          {loading ? (
            <ThreadListSkeleton count={5} />
          ) : showEmptyState ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/15 text-3xl">
                💡
              </div>
              <h2 className="text-2xl font-semibold text-light-primary">
                No discussions yet in {category?.name ?? 'this category'}
              </h2>
              <p className="max-w-md text-sm text-light-secondary">
                Be the first to start a conversation and help shape this community. Share your
                insights, questions, and experiences.
              </p>
              <button
                type="button"
                onClick={handleNewThreadClick}
                className="inline-flex items-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:-translate-y-0.5 hover:shadow-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-secondary"
              >
                {currentUser ? 'Start the first thread' : 'Sign in to start a thread'}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {pinnedThreads.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary">
                    <span className="h-[1px] flex-1 bg-brand-primary/30" />
                    Pinned Threads
                    <span className="h-[1px] flex-1 bg-brand-primary/30" />
                  </div>
                  <div className="space-y-4">
                    {pinnedThreads.map((thread) => (
                      <ThreadRow key={thread.id} thread={thread} isPinned />
                    ))}
                  </div>
                </div>
              )}

              {regularThreads.length > 0 && (
                <div className="space-y-4">
                  {pinnedThreads.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-light-secondary/70">
                      <span className="h-[1px] flex-1 bg-border-dark/50" />
                      Recent Threads
                      <span className="h-[1px] flex-1 bg-border-dark/50" />
                    </div>
                  )}
                  <div className="space-y-4">
                    {regularThreads.map((thread) => (
                      <ThreadRow key={thread.id} thread={thread} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {pagination.totalPages > 1 && (
          <div className="pb-6">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <CreateThreadModal
        isOpen={isComposerOpen}
        categoryName={category?.name ?? ''}
        onClose={() => setIsComposerOpen(false)}
        onCreate={handleThreadCreation}
      />
    </div>
  );
};

interface AvatarProps {
  name?: string | null;
  imageUrl?: string | null;
}

const Avatar: React.FC<AvatarProps> = ({ name, imageUrl }) => {
  const [hasError, setHasError] = useState(false);

  const initials = useMemo(() => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }, [name]);

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={name ?? 'User avatar'}
        onError={() => setHasError(true)}
        className="h-11 w-11 rounded-full border border-border-dark/60 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-dark/60 bg-gradient-to-br from-dark-primary to-dark-secondary text-base font-semibold text-light-primary shadow-sm">
      {initials}
    </div>
  );
};

const ThreadRow: React.FC<{ thread: ForumThread; isPinned?: boolean }> = ({
  thread,
  isPinned = false,
}) => {
  const replyCount =
    typeof thread.replyCount === 'number'
      ? thread.replyCount
      : Math.max(0, (thread.postCount ?? 0));
  const viewCount = typeof thread.viewCount === 'number' ? thread.viewCount : 0;
  const authorName =
    thread.author?.name ?? thread.author?.username ?? 'Community Member';
  const startedLabel = formatDate(thread.createdAt);
  const lastActivityLabel = formatRelativeTime(
    thread.lastActivityAt ?? thread.updatedAt ?? thread.createdAt,
  );

  return (
    <Link
      to={`/forum/thread/${thread.slug}`}
      className={`group block overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-200 sm:px-6 ${
        isPinned
          ? 'border-brand-primary/70 bg-brand-primary/10 shadow-[0_15px_45px_rgba(67,137,255,0.25)] hover:border-brand-primary hover:shadow-[0_20px_60px_rgba(67,137,255,0.35)]'
          : 'border-border-dark/60 bg-dark-primary/60 hover:border-brand-primary/40 hover:bg-dark-primary/80'
      }`}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.8fr)_1.4fr_0.8fr_0.8fr_1fr] md:items-center">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="hidden sm:block">
              <Avatar name={authorName} imageUrl={thread.author?.profilePictureUrl ?? null} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isPinned && (
                  <span className="inline-flex items-center rounded-full border border-brand-primary/60 bg-brand-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">
                    📌 Pinned
                  </span>
                )}
                {thread.isLocked && (
                  <span className="inline-flex items-center rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200">
                    🔒 Locked
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-light-primary transition-colors group-hover:text-brand-primary md:text-xl">
                {thread.title}
              </h3>
              {(thread.excerpt ?? '').trim().length > 0 && (
                <p className="mt-2 text-sm text-light-secondary">{thread.excerpt}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-light-secondary md:hidden">
                <span className="font-medium text-light-primary">{authorName}</span>
                <span className="text-light-secondary/60">•</span>
                <span>{replyCount} replies</span>
                <span className="text-light-secondary/60">•</span>
                <span>{viewCount.toLocaleString()} views</span>
                <span className="text-light-secondary/60">•</span>
                <span>{lastActivityLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Avatar name={authorName} imageUrl={thread.author?.profilePictureUrl ?? null} />
          <div className="leading-snug">
            <p className="text-sm font-semibold text-light-primary">{authorName}</p>
            <p className="text-xs text-light-secondary">Started {startedLabel}</p>
          </div>
        </div>

        <div className="hidden items-center justify-center rounded-xl bg-dark-secondary/70 px-3 py-2 text-sm font-semibold text-light-primary md:flex">
          {replyCount.toLocaleString()}
        </div>

        <div className="hidden items-center justify-center rounded-xl bg-dark-secondary/70 px-3 py-2 text-sm font-semibold text-light-primary md:flex">
          {viewCount.toLocaleString()}
        </div>

        <div className="hidden flex-col items-start justify-center md:flex">
          <span className="text-sm font-semibold text-light-primary">{lastActivityLabel}</span>
          <span className="text-xs text-light-secondary">Last activity</span>
        </div>
      </div>
    </Link>
  );
};

const ThreadListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 pt-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`thread-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-border-dark/50 bg-dark-primary/50 px-4 py-5 sm:px-6"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.8fr)_1.4fr_0.8fr_0.8fr_1fr] md:items-center">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-dark-secondary/70" />
              <div className="h-5 w-3/4 rounded-full bg-dark-secondary/60" />
              <div className="hidden space-y-2 md:block">
                <div className="h-3 w-24 rounded-full bg-dark-secondary/70" />
                <div className="h-3 w-32 rounded-full bg-dark-secondary/70" />
              </div>
            </div>
            <div className="hidden space-y-2 md:block">
              <div className="h-4 w-28 rounded-full bg-dark-secondary/70" />
              <div className="h-3 w-20 rounded-full bg-dark-secondary/60" />
            </div>
            <div className="hidden h-6 rounded-full bg-dark-secondary/70 md:block" />
            <div className="hidden h-6 rounded-full bg-dark-secondary/70 md:block" />
            <div className="hidden h-5 w-28 rounded-full bg-dark-secondary/70 md:block" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface CreateThreadModalProps {
  isOpen: boolean;
  categoryName?: string;
  onClose: () => void;
  onCreate: (values: CreateThreadPayload) => Promise<void>;
}

const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  isOpen,
  categoryName,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 10) {
      setFormError('Thread title should be at least 10 characters long.');
      return;
    }

    if (trimmedContent.length < 20) {
      setFormError('Please add more details to your post (minimum 20 characters).');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await onCreate({ title: trimmedTitle, content: trimmedContent });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border-dark/60 bg-dark-secondary/80 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-border-dark/60 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary">
              New Discussion
            </p>
            <h2 className="mt-1 text-2xl font-bold text-light-primary">
              {categoryName ? `Start a thread in ${categoryName}` : 'Start a new thread'}
            </h2>
            <p className="mt-1 text-sm text-light-secondary">
              Share insights, ask questions, or start a collaboration with the community.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-light-secondary transition hover:bg-dark-primary/80 hover:text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="Close new thread modal"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          <div className="space-y-2">
            <label htmlFor="thread-title" className="text-sm font-semibold text-light-primary">
              Thread Title
            </label>
            <input
              id="thread-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your discussion a clear, compelling title"
              maxLength={200}
              className="w-full rounded-2xl border border-border-dark/60 bg-dark-primary px-4 py-3 text-base text-light-primary shadow-inner shadow-dark-primary/40 transition focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <p className="text-xs text-light-secondary">
              Minimum 10 characters. Keep it descriptive and concise.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="thread-content" className="text-sm font-semibold text-light-primary">
              Post Details
            </label>
            <textarea
              id="thread-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share your question, insight, or resources with enough detail for others to engage."
              rows={10}
              maxLength={10000}
              className="w-full rounded-2xl border border-border-dark/60 bg-dark-primary px-4 py-3 text-base text-light-primary shadow-inner shadow-dark-primary/40 transition focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex items-center justify-between text-xs text-light-secondary">
              <span>Minimum 20 characters.</span>
              <span>{content.trim().length}/10000</span>
            </div>
          </div>

          {formError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full border border-border-dark/60 px-6 py-3 text-sm font-semibold text-light-secondary transition hover:bg-dark-primary/80 hover:text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/30 transition hover:-translate-y-0.5 hover:shadow-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-secondary disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Posting…
                </span>
              ) : (
                'Publish Thread'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForumCategoryPage;
