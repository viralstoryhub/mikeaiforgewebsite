import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import * as forumService from '../services/forumService';
import type { ForumPost, ForumThread, PaginationParams } from '../types';

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5C6.5 5 2 10 2 12s4.5 7 10 7 10-5 10-7-4.5-7-10-7zm0 11.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
  </svg>
);

const PinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M8.5 3.5 15 10m0 0-2 2 4 4 2-2m-4-4 2-2 1.5 1.5a2 2 0 0 1 0 2.8l-3.2 3.2M5 19l3-3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 10V7a5 5 0 0 1 10 0v3m-5 4v3m-5 3h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UnlockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M17 10V8a5 5 0 1 0-10 0m5 6v3m-5 3h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 7h14m-1 0-.9 10.8A2 2 0 0 1 15.1 20H8.9a2 2 0 0 1-1.99-2.2L6 7m3 0V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="m15.2 5 3.8 3.8M4 20l4.9-1.1a2 2 0 0 0 1-.52L20 8.3a1.5 1.5 0 0 0 0-2.1l-1.9-1.9a1.5 1.5 0 0 0-2.1 0L6.9 13.6a2 2 0 0 0-.52 1L5.3 19.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M10 6H5.5A1.5 1.5 0 0 0 4 7.5v4A1.5 1.5 0 0 0 5.5 13H7v1.5A1.5 1.5 0 0 0 8.5 16H11m7-10h-4.5A1.5 1.5 0 0 0 12 7.5v4A1.5 1.5 0 0 0 13.5 13H15v1.5A1.5 1.5 0 0 0 16.5 16H19"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const POSTS_PER_PAGE = 15;
const REPLY_CHAR_LIMIT = 5000;

interface ThreadResponsePayload {
  thread: ForumThread;
  posts: ForumPost[];
  pagination?: PaginationParams;
}

const isNonEmptyString = (value?: string | null): value is string => Boolean(value && value.trim().length > 0);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const transformRichText = (value: string): string => {
  const escaped = escapeHtml(value);
  const withCode = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-dark-primary/70 border border-border-dark rounded-lg p-4 overflow-x-auto text-sm"><code>$1</code></pre>');
  const inlineCode = withCode.replace(/`([^`]+?)`/g, '<code class="bg-dark-primary/70 px-1.5 py-0.5 rounded text-sm">$1</code>');
  const bold = inlineCode.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/__(.*?)__/g, '<strong>$1</strong>');
  const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/_(.*?)_/g, '<em>$1</em>');
  const links = italic.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="text-brand-primary hover:underline" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const paragraphs = links.split(/\n{2,}/).map((block) => `<p class="mb-4 last:mb-0 leading-7">${block.replace(/\n/g, '<br />')}</p>`);
  return paragraphs.join('');
};

const safelyFormatContent = (content?: string | null): string => {
  if (!isNonEmptyString(content)) {
    return '<p class="text-light-secondary">No content provided.</p>';
  }
  return transformRichText(content);
};

const formatDateTime = (value?: string | null): string => {
  if (!isNonEmptyString(value)) {
    return 'Unknown date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatRelativeTime = (value?: string | null): string => {
  if (!isNonEmptyString(value)) {
    return 'N/A';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, amount] of Object.entries(intervals)) {
    if (seconds >= amount) {
      const count = Math.floor(seconds / amount);
      return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

const buildAvatarUrl = (name?: string, email?: string, existing?: string | null): string => {
  if (isNonEmptyString(existing)) {
    return existing;
  }
  const identifier = isNonEmptyString(email) ? email : isNonEmptyString(name) ? name : 'member';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(identifier)}&background=1f2937&color=f8fafc`;
};

const determinePostCount = (post: ForumPost): number => {
  const direct = (post.author as any)?.forumPostCount ?? (post.author as any)?.postCount;
  if (typeof direct === 'number') {
    return direct;
  }
  return 0;
};

const ForumThreadPage: React.FC = () => {
  const { threadSlug } = useParams<{ threadSlug: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: POSTS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [threadActionLoading, setThreadActionLoading] = useState<boolean>(false);
  const [initialFetchComplete, setInitialFetchComplete] = useState<boolean>(false);

  const isAdmin = useMemo(() => {
    if (!currentUser?.role) return false;
    const normalized = currentUser.role.toLowerCase();
    return ['admin', 'superadmin', 'moderator', 'owner'].includes(normalized);
  }, [currentUser?.role]);

  const isThreadLocked = Boolean(thread?.isLocked);
  const canReply = Boolean(currentUser && !isThreadLocked);

  const hydrateThread = useCallback(
    (payload: ThreadResponsePayload) => {
      setThread(payload.thread);
      setPosts(payload.posts ?? []);
      if (payload.pagination) {
        setPagination({
          page: payload.pagination.page ?? 1,
          limit: payload.pagination.limit ?? POSTS_PER_PAGE,
          total: payload.pagination.total ?? payload.posts.length ?? 0,
          totalPages: payload.pagination.totalPages ?? 1,
        });
      } else {
        const total = payload.posts.length;
        setPagination((prev) => ({
          page: prev.page ?? 1,
          limit: prev.limit ?? POSTS_PER_PAGE,
          total,
          totalPages: Math.max(1, Math.ceil(total / (prev.limit ?? POSTS_PER_PAGE))),
        }));
      }
    },
    []
  );

  const fetchThread = useCallback(
    async (page = 1, initial = false) => {
      if (!threadSlug) return;
      setPageError(null);
      if (initial) {
        setLoading(true);
      } else {
        setPostsLoading(true);
      }
      try {
        const payload = (await forumService.getThreadBySlug(threadSlug, page, POSTS_PER_PAGE)) as ThreadResponsePayload;
        hydrateThread(payload);
      } catch (error) {
        console.error('Failed to load thread', error);
        const message =
          error instanceof Error ? error.message : 'Unable to load this thread right now. Please try again later.';
        if (!initialFetchComplete) {
          setPageError(message);
        }
      } finally {
        setLoading(false);
        setPostsLoading(false);
        setInitialFetchComplete(true);
      }
    },
    [threadSlug, hydrateThread, initialFetchComplete]
  );

  useEffect(() => {
    void fetchThread(1, true);
  }, [fetchThread]);

  const scrollToReplyEditor = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    });
  }, []);

  const handlePageChange = async (page: number) => {
    await fetchThread(page);
  };

  const handleFormat = (format: 'bold' | 'italic' | 'code' | 'link') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = replyContent.substring(start, end);
    let formatted = '';
    if (format === 'bold') {
      formatted = `**${selected || 'bold text'}**`;
    } else if (format === 'italic') {
      formatted = `*${selected || 'italic text'}*`;
    } else if (format === 'code') {
      const multiLine = selected.includes('\n');
      formatted = multiLine ? `\`\`\`\n${selected || 'code block'}\n\`\`\`` : `\`${selected || 'code'}\``;
    } else if (format === 'link') {
      const url = window.prompt('Enter the URL', 'https://');
      if (!url) return;
      formatted = `[${selected || 'link text'}](${url.trim()})`;
    }
    const before = replyContent.substring(0, start);
    const after = replyContent.substring(end);
    const nextValue = `${before}${formatted}${after}`;
    setReplyContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = before.length + formatted.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleQuote = (post: ForumPost) => {
    const base = post.content ?? '';
    const quoted = base
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    const separator = replyContent.trim().length > 0 ? '\n\n' : '';
    const nextValue = `${replyContent}${separator}${quoted}\n\n`;
    setReplyContent(nextValue);
    scrollToReplyEditor();
  };

  const handleSubmitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!thread || !currentUser) {
      setReplyError('You must be logged in to reply.');
      return;
    }
    if (isThreadLocked) {
      setReplyError('This thread is locked. New replies are disabled.');
      return;
    }
    const trimmed = replyContent.trim();
    if (trimmed.length < 5) {
      setReplyError('Your reply must be at least 5 characters long.');
      return;
    }
    if (trimmed.length > REPLY_CHAR_LIMIT) {
      setReplyError(`Replies cannot exceed ${REPLY_CHAR_LIMIT.toLocaleString()} characters.`);
      return;
    }

    setReplyError(null);
    setIsSubmittingReply(true);

    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const tempPost: ForumPost = {
      id: tempId,
      threadId: thread.id,
      content: trimmed,
      authorId: currentUser.id,
      author: currentUser,
      createdAt: timestamp,
      updatedAt: timestamp,
      isEdited: false,
    } as ForumPost;

    setPosts((prev) => [...prev, tempPost]);
    setThread((prev) =>
      prev
        ? {
            ...prev,
            replyCount: (prev.replyCount ?? prev.posts?.length ?? 0) + 1,
            lastActivityAt: timestamp,
          }
        : prev
    );
    setPagination((prev) => {
      const total = (prev.total ?? 0) + 1;
      const limit = prev.limit ?? POSTS_PER_PAGE;
      return {
        ...prev,
        total,
        totalPages: Math.max(prev.totalPages ?? 1, Math.ceil(total / limit)),
      };
    });
    setReplyContent('');

    try {
      const createdPost = (await forumService.createPost(thread.id, trimmed)) as ForumPost;
      setPosts((prev) =>
        prev.map((post) => (post.id === tempId ? createdPost : post))
      );
      setThread((prev) =>
        prev
          ? {
              ...prev,
              replyCount: (prev.replyCount ?? 0) + (createdPost.id === tempId ? 0 : 0),
              lastActivityAt: createdPost.createdAt ?? timestamp,
            }
          : prev
      );
      if (pagination.page === pagination.totalPages || posts.length + 1 <= pagination.limit) {
        scrollToReplyEditor();
      } else {
        await fetchThread(pagination.page);
      }
    } catch (error) {
      console.error('Failed to create post', error);
      setPosts((prev) => prev.filter((post) => post.id !== tempId));
      setThread((prev) =>
        prev
          ? {
              ...prev,
              replyCount: Math.max(0, (prev.replyCount ?? 1) - 1),
            }
          : prev
      );
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, (prev.total ?? 1) - 1),
      }));
      setReplyContent(trimmed);
      const message =
        error instanceof Error ? error.message : 'We could not submit your reply. Please try again.';
      setReplyError(message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const beginEditingPost = (post: ForumPost) => {
    setEditingPostId(post.id);
    setEditingContent(post.content ?? '');
    scrollToReplyEditor();
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingContent('');
  };

  const saveEditedPost = async (postId: string) => {
    const trimmed = editingContent.trim();
    if (trimmed.length < 3) {
      setPageError('Updated content must be at least 3 characters.');
      return;
    }

    const snapshot = posts.map((post) => ({ ...post }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              content: trimmed,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : post
      )
    );
    setEditingPostId(null);
    setEditingContent('');
    setPageError(null);

    try {
      const updatedPost = (await forumService.updatePost(postId, trimmed)) as ForumPost;
      setPosts((prev) => prev.map((post) => (post.id === postId ? updatedPost : post)));
    } catch (error) {
      console.error('Failed to update post', error);
      setPosts(snapshot);
      const message =
        error instanceof Error ? error.message : 'Unable to update the post. Please try again.';
      setPageError(message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }
    const snapshot = posts.map((post) => ({ ...post }));
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setThread((prev) =>
      prev
        ? {
            ...prev,
            replyCount: Math.max(0, (prev.replyCount ?? 1) - 1),
          }
        : prev
    );
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, (prev.total ?? 1) - 1),
    }));

    try {
      await forumService.deletePost(postId);
      if (posts.length - 1 === 0) {
        await fetchThread(pagination.page);
      }
    } catch (error) {
      console.error('Failed to delete post', error);
      setPosts(snapshot);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              replyCount: (prev.replyCount ?? 0) + 1,
            }
          : prev
      );
      setPageError('We were unable to delete that reply. Please try again.');
    }
  };

  const handleTogglePin = async () => {
    if (!thread) return;
    if (threadActionLoading) return;
    setThreadActionLoading(true);
    const snapshot = thread;
    setThread((prev) =>
      prev
        ? {
            ...prev,
            isPinned: !prev.isPinned,
          }
        : prev
    );
    try {
      await forumService.togglePinThread(thread.id);
    } catch (error) {
      console.error('Failed to toggle pin', error);
      setThread(snapshot);
      setPageError('Unable to update pin status right now.');
    } finally {
      setThreadActionLoading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!thread) return;
    if (threadActionLoading) return;
    setThreadActionLoading(true);
    const snapshot = thread;
    setThread((prev) =>
      prev
        ? {
            ...prev,
            isLocked: !prev.isLocked,
          }
        : prev
    );
    try {
      await forumService.toggleLockThread(thread.id);
    } catch (error) {
      console.error('Failed to toggle lock', error);
      setThread(snapshot);
      setPageError('Unable to update lock status right now.');
    } finally {
      setThreadActionLoading(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!window.confirm('Are you sure you want to delete this entire thread?')) {
      return;
    }
    try {
      await forumService.deleteThread(thread.id);
      navigate(`/forum/${thread.category?.slug ?? ''}` || '/forum', { replace: true });
    } catch (error) {
      console.error('Failed to delete thread', error);
      setPageError('Unable to delete thread. Please try again.');
    }
  };

  const renderAuthorInfo = (entity: { author?: any; authorId?: string }) => {
    const author = entity.author ?? null;
    const displayName =
      author?.displayName ||
      author?.name ||
      author?.username ||
      'Community Member';
    const badge = author?.role ? author.role : null;
    const joinedAt = author?.createdAt;
    const avatarUrl = buildAvatarUrl(displayName, author?.email, author?.profilePictureUrl);
    const totalPosts = determinePostCount(entity as ForumPost);

    return (
      <div className="flex flex-col items-center md:items-start md:min-w-[180px] lg:min-w-[220px]">
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className="w-14 h-14 rounded-full border border-border-dark object-cover mb-3"
        />
        <div className="text-center md:text-left">
          <p className="text-base font-semibold text-light-primary">{displayName}</p>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-semibold rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/40">
              {badge}
            </span>
          )}
          {joinedAt && (
            <p className="text-xs text-light-tertiary mt-2">Joined {formatDateTime(joinedAt)}</p>
          )}
          <p className="text-xs text-light-tertiary mt-1">{totalPosts} posts</p>
        </div>
      </div>
    );
  };

  const categorySlug = thread?.category?.slug ?? (thread as any)?.categorySlug ?? '';
  const categoryName = thread?.category?.name ?? (thread as any)?.categoryName ?? 'Category';
  const lastActivityLabel = thread?.lastActivityAt ? formatRelativeTime(thread.lastActivityAt) : 'N/A';
  const replyCountLabel = thread?.replyCount ?? posts.length ?? 0;

  if (loading && !initialFetchComplete) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <p className="text-lg text-light-secondary">Loading thread...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-light-primary mb-4">Thread Not Found</h1>
        <p className="text-light-secondary mb-8">We couldn&apos;t locate the discussion you were looking for.</p>
        <Link
          to="/forum"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition"
        >
          Back to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <nav className="text-sm text-light-tertiary flex items-center flex-wrap gap-2 mb-8">
        <Link to="/forum" className="hover:text-brand-primary transition-colors">
          Forum
        </Link>
        <span>/</span>
        <Link
          to={categorySlug ? `/forum/${categorySlug}` : '/forum'}
          className="hover:text-brand-primary transition-colors"
        >
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-light-secondary truncate max-w-[50vw] sm:max-w-none">{thread.title}</span>
      </nav>

      {pageError && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {pageError}
        </div>
      )}

      <header className="bg-dark-secondary border border-border-dark rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/20 mb-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {thread.isPinned && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
                    <PinIcon className="w-4 h-4" />
                    Pinned
                  </span>
                )}
                {thread.isLocked && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/15 text-orange-400 border border-orange-400/30">
                    <LockIcon className="w-4 h-4" />
                    Locked
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-light-primary leading-tight">
                {thread.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-light-secondary">
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  <span>{(thread.viewCount ?? 0).toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChatBubbleIcon />
                  <span>{replyCountLabel.toLocaleString()} replies</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Last activity {lastActivityLabel}</span>
                </div>
              </div>
            </div>
            {(isAdmin || currentUser?.id === thread.authorId) && (
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={handleTogglePin}
                      disabled={threadActionLoading}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-50"
                    >
                      <PinIcon className="w-4 h-4" />
                      {thread.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleLock}
                      disabled={threadActionLoading}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-50"
                    >
                      {thread.isLocked ? <UnlockIcon className="w-4 h-4" /> : <LockIcon className="w-4 h-4" />}
                      {thread.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </>
                )}
                {(isAdmin || currentUser?.id === thread.authorId) && (
                  <button
                    type="button"
                    onClick={handleDeleteThread}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="border border-border-dark rounded-xl bg-dark-primary/60 p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {renderAuthorInfo(thread)}
              <article className="flex-1 prose prose-invert max-w-none text-light-secondary">
                <div dangerouslySetInnerHTML={{ __html: safelyFormatContent(thread.content) }} />
                <p className="mt-6 text-xs text-light-tertiary">
                  Posted {formatDateTime(thread.createdAt)} · Last updated {formatDateTime(thread.updatedAt)}
                </p>
              </article>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-6 mb-12">
        {postsLoading && (
          <div className="rounded-lg border border-border-dark bg-dark-secondary/70 px-4 py-6 text-center text-sm text-light-secondary">
            Loading replies...
          </div>
        )}

        {!postsLoading && posts.length === 0 && (
          <div className="rounded-lg border border-border-dark bg-dark-secondary/70 px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-light-primary">No replies yet</h3>
            <p className="mt-2 text-light-secondary">Be the first to share your thoughts with the community.</p>
          </div>
        )}

        {posts.map((post) => {
          const canModify = isAdmin || currentUser?.id === post.authorId;
          const isEditing = editingPostId === post.id;
          return (
            <div
              key={post.id}
              className="border border-border-dark rounded-xl bg-dark-secondary/80 p-5 sm:p-6 hover:border-brand-primary/30 transition"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {renderAuthorInfo(post)}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-sm text-light-tertiary">
                      Posted {formatDateTime(post.createdAt)} · {formatRelativeTime(post.createdAt)}
                    </p>
                    <div className="flex items-center gap-2">
                      {post.isEdited && (
                        <span className="text-xs text-light-tertiary bg-dark-primary/60 px-2 py-1 rounded">
                          Edited
                        </span>
                      )}
                      {canModify && !isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => beginEditingPost(post)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/60 hover:border-brand-primary/40 hover:text-brand-primary transition"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-border-dark bg-dark-primary/70 px-4 py-3 text-sm text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-4 py-2 text-sm font-semibold rounded-lg border border-border-dark text-light-secondary hover:text-light-primary transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditedPost(post.id)}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <article className="text-light-secondary prose prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: safelyFormatContent(post.content) }} />
                    </article>
                  )}

                  {canReply && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => handleQuote(post)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/60 hover:border-brand-primary/40 hover:text-brand-primary transition"
                      >
                        <QuoteIcon className="w-4 h-4" />
                        Quote
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {pagination.totalPages > 1 && (
          <div className="pt-6">
            <Pagination
              currentPage={pagination.page ?? 1}
              totalPages={pagination.totalPages ?? 1}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </section>

      <section className="mb-16">
        <form
          onSubmit={handleSubmitReply}
          className="border border-border-dark rounded-2xl bg-dark-secondary/90 p-6 sm:p-8 shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-light-primary">Leave a Reply</h2>
            {thread.isLocked && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/15 text-orange-400 border border-orange-400/30">
                <LockIcon className="w-4 h-4" />
                Locked
              </span>
            )}
          </div>

          {!currentUser && (
            <div className="mb-4 rounded-lg border border-border-dark bg-dark-primary/60 px-4 py-3 text-sm text-light-secondary">
              Please{' '}
              <Link to="/login" className="text-brand-primary hover:underline font-semibold">
                sign in
              </Link>{' '}
              to join the conversation.
            </div>
          )}

          {thread.isLocked && (
            <div className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
              This thread has been locked by moderators. No new replies can be posted.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleFormat('bold')}
              disabled={!canReply}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-40"
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => handleFormat('italic')}
              disabled={!canReply}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-40"
            >
              Italic
            </button>
            <button
              type="button"
              onClick={() => handleFormat('code')}
              disabled={!canReply}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-40"
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => handleFormat('link')}
              disabled={!canReply}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-dark bg-dark-primary/70 hover:border-brand-primary/40 hover:text-brand-primary transition disabled:opacity-40"
            >
              Link
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            rows={8}
            placeholder={
              canReply ? 'Share your insights, feedback, or follow-up questions...' : 'Sign in to post a reply.'
            }
            disabled={!canReply || isSubmittingReply}
            className="w-full rounded-xl border border-border-dark bg-dark-primary/70 px-4 py-3 text-sm text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition resize-y"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`text-xs ${
                replyContent.length > REPLY_CHAR_LIMIT ? 'text-red-400' : 'text-light-tertiary'
              }`}
            >
              {replyContent.length.toLocaleString()} / {REPLY_CHAR_LIMIT.toLocaleString()} characters
            </span>
            <button
              type="submit"
              disabled={!canReply || isSubmittingReply || replyContent.trim().length === 0 || replyContent.length > REPLY_CHAR_LIMIT}
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition disabled:opacity-50"
            >
              {isSubmittingReply ? 'Posting…' : 'Post Reply'}
            </button>
          </div>

          {replyError && <p className="mt-3 text-sm text-red-400">{replyError}</p>}
        </form>
      </section>
    </div>
  );
};

const ChatBubbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-4 h-4'} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 17.5 4 21l3.5-1a9 9 0 1 0-2.5-2.5z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ForumThreadPage;