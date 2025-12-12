import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTiltEffect } from '../hooks/useTiltEffect';
import * as forumService from '../services/forumService';
import type { ForumCategory, ForumThread } from '../types';
import ForumThreadModal from '../components/ForumThreadModal';
import Seo from '../components/Seo';

type ForumCategoryWithExtras = ForumCategory & {
  lastActivityAt?: string | null;
  recentThreads?: ForumThread[];
  activeUsersToday?: number;
};

type EnrichedThread = ForumThread & {
  category: ForumCategoryWithExtras;
};

const formatRelativeTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'No activity yet';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return 'No activity yet';

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'Just now';
  if (diff < hour) {
    const value = Math.round(diff / minute);
    return `${value} minute${value === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const value = Math.round(diff / hour);
    return `${value} hour${value === 1 ? '' : 's'} ago`;
  }
  if (diff < week) {
    const value = Math.round(diff / day);
    return `${value} day${value === 1 ? '' : 's'} ago`;
  }
  if (diff < month) {
    const value = Math.round(diff / week);
    return `${value} week${value === 1 ? '' : 's'} ago`;
  }
  if (diff < year) {
    const value = Math.round(diff / month);
    return `${value} month${value === 1 ? '' : 's'} ago`;
  }
  const value = Math.round(diff / year);
  return `${value} year${value === 1 ? '' : 's'} ago`;
};

const getThreadActivityDate = (thread: ForumThread) =>
  thread.lastActivityAt || thread.updatedAt || thread.createdAt;

const CategoryCard: React.FC<{
  category: ForumCategoryWithExtras;
  index: number;
  onClick: (slug: string) => void;
}> = ({ category, index, onClick }) => {
  const tiltRef = useTiltEffect<HTMLDivElement>();
  const lastActivityLabel = formatRelativeTime(
    category.lastActivityAt ||
      getThreadActivityDate(category.recentThreads?.[0] ?? ({} as ForumThread))
  );

  return (
    <div
      ref={tiltRef}
      className="tilt-card h-full animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        type="button"
        onClick={() => onClick(category.slug)}
        className="w-full text-left p-6 bg-dark-secondary rounded-xl border border-border-dark transition-all duration-300 hover:border-brand-primary/60 hover:-translate-y-1 glare-effect"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-dark-primary border border-border-dark text-2xl">
              {category.icon || '💬'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-light-primary">{category.name}</h3>
              <p className="mt-1 text-sm text-light-secondary line-clamp-2">
                {category.description}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-sm text-light-secondary">
          <div className="rounded-lg bg-dark-primary border border-border-dark px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Threads</p>
            <p className="mt-1 text-lg font-semibold text-light-primary">
              {(category.threadCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-dark-primary border border-border-dark px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Posts</p>
            <p className="mt-1 text-lg font-semibold text-light-primary">
              {(category.postCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-dark-primary border border-border-dark px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Last activity</p>
            <p className="mt-1 text-sm font-medium text-brand-primary">{lastActivityLabel}</p>
          </div>
        </div>
      </button>
    </div>
  );
};

const CategoryCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="h-full animate-fade-in-up"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    <div className="h-full p-6 bg-dark-secondary/60 rounded-xl border border-border-dark">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-dark-primary animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 bg-dark-primary animate-pulse rounded" />
          <div className="h-3 w-full bg-dark-primary animate-pulse rounded" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-lg bg-dark-primary animate-pulse h-16" />
        ))}
      </div>
    </div>
  </div>
);

const RecentThreadCard: React.FC<{ thread: EnrichedThread }> = ({ thread }) => {
  const navigate = useNavigate();
  const handleClick = useCallback(() => {
    navigate(`/forum/thread/${thread.slug}`);
  }, [navigate, thread.slug]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left p-4 rounded-lg border border-border-dark bg-dark-secondary hover:border-brand-primary/70 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
          {thread.category.name}
        </span>
        <span className="text-xs text-light-secondary">
          {formatRelativeTime(getThreadActivityDate(thread))}
        </span>
      </div>
      <h4 className="mt-3 text-sm font-semibold text-light-primary line-clamp-2">
        {thread.title}
      </h4>
      <div className="mt-4 flex items-center justify-between text-xs text-light-secondary">
        <div className="flex items-center gap-2">
          <span className="font-medium text-light-primary">
            {thread.author?.name ?? 'Anonymous'}
          </span>
          <span>•</span>
          <span>{(thread.replyCount ?? 0).toLocaleString()} replies</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{(thread.viewCount ?? 0).toLocaleString()} views</span>
        </div>
      </div>
    </button>
  );
};

const ForumPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast() as any;

  const [categories, setCategories] = useState<ForumCategoryWithExtras[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await forumService.getCategories();
      setCategories(response as ForumCategoryWithExtras[]);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load forum categories.';
      setError(message);
      toast?.showToast?.({
        type: 'error',
        title: 'Unable to load forum',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const stats = useMemo(() => {
    const totalThreads = categories.reduce(
      (sum, cat) => sum + (cat.threadCount ?? 0),
      0
    );
    const totalPosts = categories.reduce(
      (sum, cat) => sum + (cat.postCount ?? 0),
      0
    );

    const derivedActiveUsers = new Set<string>();
    categories.forEach((category) => {
      category.recentThreads?.forEach((thread) => {
        if (thread.authorId) {
          derivedActiveUsers.add(thread.authorId);
        }
        (thread as any)?.recentParticipants?.forEach?.((userId: string) => {
          derivedActiveUsers.add(userId);
        });
      });
    });

    const activeUsersToday =
      categories.reduce(
        (sum, cat) => sum + (cat.activeUsersToday ?? 0),
        0
      ) || derivedActiveUsers.size;

    return {
      totalThreads,
      totalPosts,
      activeUsersToday,
    };
  }, [categories]);

  const recentThreads = useMemo<EnrichedThread[]>(() => {
    const collection: EnrichedThread[] = [];
    categories.forEach((category) => {
      category.recentThreads?.forEach((thread) => {
        collection.push({
          ...thread,
          category,
        });
      });
    });

    return collection
      .sort((a, b) => {
        const dateA = new Date(getThreadActivityDate(a) ?? 0).getTime();
        const dateB = new Date(getThreadActivityDate(b) ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [categories]);

  const handleCategoryNavigation = useCallback(
    (slug: string) => {
      navigate(`/forum/${slug}`);
    },
    [navigate]
  );

  const handleCreateThread = useCallback(() => {
    if (currentUser) {
      setIsModalOpen(true);
    } else {
      toast?.showToast?.({
        type: 'info',
        title: 'Authentication required',
        description: 'You need to be logged in to create a new thread.',
      });
      navigate('/login');
    }
  }, [currentUser, navigate, toast]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleThreadCreated = (newThread: ForumThread) => {
    toast?.showToast?.({
      type: 'success',
      title: 'Thread Created',
      description: `Your new thread "${newThread.title}" has been posted.`,
    });
    setIsModalOpen(false);
    // Re-fetch categories to update thread counts and recent activity
    fetchCategories();
  };

  return (
    <>
      <Seo
        title="Community Forum | Mike's AI Forge"
        description="Connect with fellow AI creators, share workflows, and discuss the latest AI breakthroughs. Join our vibrant community of builders and innovators."
        canonicalPath="/forum"
      />
      <div className="animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-primary">
                Community Hub
              </p>
              <h1 className="mt-2 text-4xl font-extrabold text-light-primary sm:text-5xl">
                Community Forum
              </h1>
              <p className="mt-3 max-w-3xl text-lg text-light-secondary">
                Connect with fellow creators, share your workflows, and stay in the loop on
                the latest AI breakthroughs. Dive into discussions or start a new thread to
                get feedback from the community.
              </p>
            </div>
          {currentUser && (
            <button
              type="button"
              onClick={handleCreateThread}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-1 hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-primary"
            >
              <span>＋</span>
              <span>Create New Thread</span>
            </button>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`stats-skeleton-${index}`}
                className="rounded-xl border border-border-dark bg-dark-secondary/60 p-6 animate-pulse"
              >
                <div className="h-3 w-20 bg-dark-primary rounded" />
                <div className="mt-4 h-7 w-1/2 bg-dark-primary rounded" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl border border-border-dark bg-dark-secondary p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Total Threads
                </p>
                <p className="mt-3 text-3xl font-bold text-light-primary">
                  {stats.totalThreads.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border-dark bg-dark-secondary p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Total Posts
                </p>
                <p className="mt-3 text-3xl font-bold text-light-primary">
                  {stats.totalPosts.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border-dark bg-dark-secondary p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Active Users Today
                </p>
                <p className="mt-3 text-3xl font-bold text-light-primary">
                  {stats.activeUsersToday.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </section>

        {error && !loading && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchCategories}
                className="text-xs font-semibold uppercase tracking-wide text-red-200 hover:text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-light-primary">Browse Categories</h2>
              <Link
                to="/forum"
                className="hidden text-sm font-semibold text-brand-primary hover:underline md:inline-flex"
              >
                View All Threads →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <CategoryCardSkeleton key={`category-skeleton-${index}`} index={index} />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categories.map((category, index) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    onClick={handleCategoryNavigation}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border-dark bg-dark-secondary/60 p-8 text-center">
                <h3 className="text-lg font-semibold text-light-primary">
                  No categories available yet
                </h3>
                <p className="mt-2 text-sm text-light-secondary">
                  Check back soon as we spin up the first community discussions.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-light-primary">Recent Activity</h3>
              <Link
                to="/forum"
                className="text-xs font-semibold uppercase tracking-wide text-brand-primary hover:underline"
              >
                See All
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`recent-skeleton-${index}`}
                    className="h-24 rounded-lg border border-border-dark bg-dark-secondary/60 animate-pulse"
                  />
                ))}
              </div>
            ) : recentThreads.length > 0 ? (
              <div className="space-y-4">
                {recentThreads.map((thread) => (
                  <RecentThreadCard key={thread.id} thread={thread} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border-dark bg-dark-secondary/60 p-6 text-sm text-light-secondary">
                No recent thread activity yet. Start a conversation and be the first to
                spark the discussion!
              </div>
            )}
          </aside>
        </div>
      </div>

      <ForumThreadModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onThreadCreated={handleThreadCreated}
      />
    </div>
    </>
  );
};

export default ForumPage;