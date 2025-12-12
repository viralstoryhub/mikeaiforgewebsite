import React, {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useState,
    FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ForumCategory, ForumPost, ForumThread } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import * as forumService from '../../services/forumService';

type ModerationThread = ForumThread & {
    category?: ForumCategory;
};

type ForumCategoryPayload = {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
};

type AdminThreadQuery = {
    categorySlug?: string;
    status?: 'pinned' | 'locked';
    search?: string;
    limit?: number;
};

type ForumCategoryStats = ForumCategory & {
    threadCount?: number;
    postCount?: number;
    lastActivityAt?: string | Date | null;
};

interface AdminThreadsResponse {
    threads: ModerationThread[];
    total?: number;
}

type ForumAdminService = {
    getCategories: () => Promise<ForumCategoryStats[]>;
    createCategory: (payload: ForumCategoryPayload) => Promise<ForumCategoryStats>;
    updateCategory: (
        id: string,
        payload: Partial<ForumCategoryPayload>
    ) => Promise<ForumCategoryStats>;
    deleteCategory: (id: string) => Promise<void>;
    getAdminThreads: (
        params?: AdminThreadQuery
    ) => Promise<AdminThreadsResponse | ModerationThread[]>;
    updateThread: (
        id: string,
        payload: Partial<Pick<ForumThread, 'title' | 'content'>>
    ) => Promise<ForumThread>;
    deleteThread: (id: string) => Promise<void>;
    togglePinThread: (id: string, value?: boolean) => Promise<ForumThread>;
    toggleLockThread: (id: string, value?: boolean) => Promise<ForumThread>;
    bulkUpdateThreads?: (
        ids: string[],
        payload: Partial<ForumThread>
    ) => Promise<void>;
    getFlaggedPosts?: () => Promise<ForumPost[]>;
};

const forumApi = forumService as unknown as ForumAdminService;

const toSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

const formatDateTime = (value?: string | Date | null): string => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
};

const formatRelativeTime = (input?: string | Date | null): string => {
    if (!input) return '—';
    const date = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const numberFormatter = (value: number | undefined): string =>
    (value ?? 0).toLocaleString();

interface CategoryModalValues {
    id?: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    displayOrder?: number;
}

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: CategoryModalValues) => Promise<void>;
    initialValues?: CategoryModalValues | null;
    defaultDisplayOrder: number;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialValues,
    defaultDisplayOrder,
}) => {
    const [formValues, setFormValues] = useState<CategoryModalValues>({
        name: '',
        slug: '',
        description: '',
        icon: '',
        displayOrder: defaultDisplayOrder,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof CategoryModalValues, string>>>(
        {}
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialValues) {
                setFormValues({
                    id: initialValues.id,
                    name: initialValues.name,
                    slug: initialValues.slug,
                    description: initialValues.description ?? '',
                    icon: initialValues.icon ?? '',
                    displayOrder:
                        initialValues.displayOrder ?? defaultDisplayOrder,
                });
            } else {
                setFormValues({
                    name: '',
                    slug: '',
                    description: '',
                    icon: '',
                    displayOrder: defaultDisplayOrder,
                });
            }
            setErrors({});
            setSubmitError(null);
        }
    }, [initialValues, isOpen, defaultDisplayOrder]);

    if (!isOpen) return null;

    const validate = () => {
        const validationErrors: Partial<Record<keyof CategoryModalValues, string>> = {};
        if (!formValues.name.trim()) {
            validationErrors.name = 'Category name is required.';
        }
        if (!formValues.slug.trim()) {
            validationErrors.slug = 'Slug is required.';
        }
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleChange = (field: keyof CategoryModalValues, value: string) => {
        setFormValues(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'name' && (!initialValues || !initialValues.slug)) {
                next.slug = toSlug(value);
            }
            if (field === 'slug') {
                next.slug = toSlug(value);
            }
            return next;
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            await onSubmit(formValues);
        } catch (error: any) {
            setSubmitError(
                error?.message || 'Failed to save the forum category.'
            );
            setIsSubmitting(false);
            return;
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-gray-900 shadow-xl ring-1 ring-white/10">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                        <h3 className="text-xl font-semibold text-white">
                            {initialValues ? 'Edit Category' : 'Create Category'}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 px-6 py-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Name<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formValues.name}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder="Community Lounge"
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Slug<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formValues.slug}
                                onChange={e => handleChange('slug', e.target.value)}
                                placeholder="community-lounge"
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                            />
                            {errors.slug && (
                                <p className="mt-1 text-xs text-red-400">{errors.slug}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Description
                            </label>
                            <textarea
                                value={formValues.description}
                                onChange={e =>
                                    handleChange('description', e.target.value)
                                }
                                rows={3}
                                placeholder="Discuss anything and everything about AI productivity."
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-200">
                                    Icon
                                </label>
                                <input
                                    type="text"
                                    value={formValues.icon}
                                    onChange={e => handleChange('icon', e.target.value)}
                                    placeholder="💬"
                                    className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Use an emoji or icon class for quick identification.
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-200">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    value={formValues.displayOrder ?? ''}
                                    onChange={e =>
                                        handleChange(
                                            'displayOrder',
                                            e.target.value
                                                ? String(Math.max(1, Number(e.target.value)))
                                                : ''
                                        )
                                    }
                                    min={1}
                                    className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Lower numbers appear first in the forum.
                                </p>
                            </div>
                        </div>

                        {submitError && (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                {submitError}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Saving…
                                </span>
                            ) : (
                                'Save Category'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminForumPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [categories, setCategories] = useState<ForumCategoryStats[]>([]);
    const [threads, setThreads] = useState<ModerationThread[]>([]);
    const [flaggedPosts, setFlaggedPosts] = useState<ForumPost[]>([]);

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingFlaggedPosts, setLoadingFlaggedPosts] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ForumCategoryStats | null>(
        null
    );
    const [reorderingCategoryId, setReorderingCategoryId] = useState<string | null>(
        null
    );

    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pinned' | 'locked'>(
        'all'
    );
    const [threadSearchTerm, setThreadSearchTerm] = useState('');
    const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [threadEditValues, setThreadEditValues] = useState<{
        title: string;
        content: string;
    }>({ title: '', content: '' });
    const [threadEditLoading, setThreadEditLoading] = useState(false);

    const fetchCategories = useCallback(async (): Promise<void> => {
        setLoadingCategories(true);
        try {
            const data = await forumApi.getCategories();
            const sorted = [...data].sort((a, b) => {
                const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
                if (orderA === orderB) {
                    return a.name.localeCompare(b.name);
                }
                return orderA - orderB;
            });
            setCategories(sorted);
        } catch (error) {
            console.error('Failed to load forum categories', error);
            addToast('Failed to load forum categories.', 'error');
        } finally {
            setLoadingCategories(false);
        }
    }, [addToast]);

    const fetchThreads = useCallback(
        async (params?: AdminThreadQuery): Promise<void> => {
            setLoadingThreads(true);
            try {
                const response = await forumApi.getAdminThreads({
                    limit: 100,
                    ...params,
                });
                const dataArray = Array.isArray(response)
                    ? response
                    : response?.threads ?? [];
                const sorted = [...dataArray].sort((a, b) => {
                    const dateA =
                        (a.lastActivityAt && new Date(a.lastActivityAt)) ||
                        (a.updatedAt && new Date(a.updatedAt)) ||
                        new Date(a.createdAt);
                    const dateB =
                        (b.lastActivityAt && new Date(b.lastActivityAt)) ||
                        (b.updatedAt && new Date(b.updatedAt)) ||
                        new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                });
                setThreads(sorted);
            } catch (error) {
                console.error('Failed to load forum threads', error);
                addToast('Failed to load forum threads.', 'error');
            } finally {
                setLoadingThreads(false);
            }
        },
        [addToast]
    );

    const fetchFlaggedPosts = useCallback(async (): Promise<void> => {
        if (!forumApi.getFlaggedPosts) {
            setFlaggedPosts([]);
            return;
        }
        setLoadingFlaggedPosts(true);
        try {
            const posts = await forumApi.getFlaggedPosts();
            setFlaggedPosts(posts);
        } catch (error) {
            console.error('Failed to load flagged posts', error);
            addToast('Failed to load flagged posts.', 'error');
        } finally {
            setLoadingFlaggedPosts(false);
        }
    }, [addToast]);

    useEffect(() => {
        void fetchCategories();
        void fetchThreads();
        void fetchFlaggedPosts();
    }, [fetchCategories, fetchThreads, fetchFlaggedPosts]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchCategories(),
                fetchThreads(),
                fetchFlaggedPosts(),
            ]);
            addToast('Forum data refreshed.', 'success');
        } catch (error) {
            console.error('Failed to refresh forum data', error);
            addToast('Something went wrong while refreshing data.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCategorySubmit = async (values: CategoryModalValues) => {
        const payload: ForumCategoryPayload = {
            name: values.name.trim(),
            slug: values.slug.trim(),
            description: values.description.trim() || undefined,
            icon: values.icon.trim() || undefined,
            displayOrder: values.displayOrder ?? categories.length + 1,
        };
        try {
            if (editingCategory) {
                await forumApi.updateCategory(editingCategory.id, payload);
                addToast('Category updated successfully.', 'success');
            } else {
                await forumApi.createCategory(payload);
                addToast('Category created successfully.', 'success');
            }
            setCategoryModalOpen(false);
            setEditingCategory(null);
            await fetchCategories();
        } catch (error: any) {
            addToast(
                error?.message || 'Could not save the forum category.',
                'error'
            );
            throw error instanceof Error ? error : new Error('Failed to save category.');
        }
    };

    const handleDeleteCategory = async (category: ForumCategoryStats) => {
        if (
            typeof window !== 'undefined' &&
            !window.confirm(
                `Delete the category "${category.name}"? Threads will need to be reassigned.`
            )
        ) {
            return;
        }
        try {
            await forumApi.deleteCategory(category.id);
            addToast('Category deleted successfully.', 'success');
            await fetchCategories();
        } catch (error) {
            console.error('Failed to delete category', error);
            addToast('Failed to delete category.', 'error');
        }
    };

    const handleMoveCategory = async (
        categoryId: string,
        direction: 'up' | 'down'
    ) => {
        const previous = categories.map(cat => ({ ...cat }));
        const index = previous.findIndex(cat => cat.id === categoryId);
        if (index === -1) return;
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= previous.length) return;

        const reordered = [...previous];
        [reordered[index], reordered[swapIndex]] = [
            reordered[swapIndex],
            reordered[index],
        ];

        reordered.forEach((cat, idx) => {
            cat.displayOrder = idx + 1;
        });

        setReorderingCategoryId(categoryId);
        setCategories(reordered);
        try {
            await Promise.all(
                reordered.map((cat, idx) =>
                    forumApi.updateCategory(cat.id, { displayOrder: idx + 1 })
                )
            );
            addToast('Category order updated.', 'success');
        } catch (error) {
            console.error('Failed to reorder categories', error);
            addToast('Failed to reorder categories.', 'error');
            setCategories(previous);
        } finally {
            setReorderingCategoryId(null);
        }
    };

    const categoryById = useMemo(() => {
        const map = new Map<string, ForumCategoryStats>();
        categories.forEach(cat => map.set(cat.id, cat));
        return map;
    }, [categories]);

    const filteredThreads = useMemo(() => {
        let data = [...threads];

        if (selectedCategoryFilter !== 'all') {
            data = data.filter(thread => {
                const category =
                    thread.category ||
                    (thread.categoryId ? categoryById.get(thread.categoryId) : null);
                return category?.slug === selectedCategoryFilter;
            });
        }

        if (statusFilter === 'pinned') {
            data = data.filter(thread => thread.isPinned);
        } else if (statusFilter === 'locked') {
            data = data.filter(thread => thread.isLocked);
        }

        if (threadSearchTerm.trim()) {
            const term = threadSearchTerm.trim().toLowerCase();
            data = data.filter(thread => {
                const titleMatch = thread.title.toLowerCase().includes(term);
                const authorMatch = thread.author?.name
                    ?.toLowerCase()
                    .includes(term);
                return titleMatch || authorMatch;
            });
        }

        return data;
    }, [threads, selectedCategoryFilter, statusFilter, threadSearchTerm, categoryById]);

    const allThreadsSelected =
        filteredThreads.length > 0 &&
        filteredThreads.every(thread => selectedThreadIds.includes(thread.id));

    const toggleSelectAllThreads = () => {
        if (allThreadsSelected) {
            setSelectedThreadIds([]);
        } else {
            setSelectedThreadIds(filteredThreads.map(thread => thread.id));
        }
    };

    const toggleThreadSelection = (threadId: string) => {
        setSelectedThreadIds(prev =>
            prev.includes(threadId)
                ? prev.filter(id => id !== threadId)
                : [...prev, threadId]
        );
    };

    const handleBulkAction = async (action: 'pin' | 'lock' | 'delete') => {
        if (!selectedThreadIds.length) return;

        if (
            action === 'delete' &&
            typeof window !== 'undefined' &&
            !window.confirm(
                `Delete ${selectedThreadIds.length} selected thread(s)? This action cannot be undone.`
            )
        ) {
            return;
        }

        setBulkActionLoading(true);
        try {
            if (action === 'delete') {
                await Promise.all(
                    selectedThreadIds.map(threadId => forumApi.deleteThread(threadId))
                );
                addToast('Selected threads deleted.', 'success');
            } else if (forumApi.bulkUpdateThreads) {
                await forumApi.bulkUpdateThreads(selectedThreadIds, {
                    isPinned: action === 'pin' ? true : undefined,
                    isLocked: action === 'lock' ? true : undefined,
                });
                addToast(
                    action === 'pin'
                        ? 'Threads pinned successfully.'
                        : 'Threads locked successfully.',
                    'success'
                );
            } else {
                if (action === 'pin') {
                    await Promise.all(
                        selectedThreadIds.map(threadId =>
                            forumApi.togglePinThread(threadId, true)
                        )
                    );
                    addToast('Threads pinned successfully.', 'success');
                } else {
                    await Promise.all(
                        selectedThreadIds.map(threadId =>
                            forumApi.toggleLockThread(threadId, true)
                        )
                    );
                    addToast('Threads locked successfully.', 'success');
                }
            }
            setSelectedThreadIds([]);
            await fetchThreads();
            await fetchCategories();
        } catch (error) {
            console.error('Bulk forum action failed', error);
            addToast('Failed to complete the bulk action.', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleStartThreadEdit = (thread: ModerationThread) => {
        setEditingThreadId(thread.id);
        setThreadEditValues({
            title: thread.title,
            content: thread.content,
        });
    };

    const handleCancelThreadEdit = () => {
        setEditingThreadId(null);
        setThreadEditValues({ title: '', content: '' });
    };

    const handleSaveThreadEdit = async () => {
        if (!editingThreadId) return;
        if (!threadEditValues.title.trim()) {
            addToast('Thread title cannot be empty.', 'warning');
            return;
        }
        if (!threadEditValues.content.trim()) {
            addToast('Thread content cannot be empty.', 'warning');
            return;
        }
        setThreadEditLoading(true);
        try {
            await forumApi.updateThread(editingThreadId, {
                title: threadEditValues.title.trim(),
                content: threadEditValues.content.trim(),
            });
            addToast('Thread updated successfully.', 'success');
            setEditingThreadId(null);
            setThreadEditValues({ title: '', content: '' });
            await fetchThreads();
        } catch (error) {
            console.error('Failed to update thread', error);
            addToast('Failed to update thread.', 'error');
        } finally {
            setThreadEditLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalThreads =
            categories.reduce((acc, cat) => acc + (cat.threadCount ?? 0), 0) ||
            threads.length;
        const totalPosts =
            categories.reduce((acc, cat) => acc + (cat.postCount ?? 0), 0) ||
            threads.reduce((acc, thread) => acc + (thread.replyCount ?? 0), 0);
        const activeUserIds = new Set<string>();
        threads.forEach(thread => {
            if (thread.authorId) activeUserIds.add(thread.authorId);
            if (thread.author?.id) activeUserIds.add(thread.author.id);
        });
        flaggedPosts.forEach(post => {
            if (post.authorId) activeUserIds.add(post.authorId);
            const authorAny = (post as unknown as { author?: { id?: string } }).author;
            if (authorAny?.id) activeUserIds.add(authorAny.id);
        });

        return {
            totalThreads,
            totalPosts,
            activeUsers: activeUserIds.size,
        };
    }, [categories, flaggedPosts, threads]);

    const mostActiveCategories = useMemo(() => {
        const sorted = [...categories].sort(
            (a, b) => (b.threadCount ?? 0) - (a.threadCount ?? 0)
        );
        return sorted.slice(0, 3);
    }, [categories]);

    const activityData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 7 }).map((_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            const count = threads.filter(thread => {
                const lastActivity =
                    (thread.lastActivityAt && new Date(thread.lastActivityAt)) ||
                    (thread.updatedAt && new Date(thread.updatedAt)) ||
                    new Date(thread.createdAt);
                return lastActivity.toDateString() === date.toDateString();
            }).length;
            return {
                label: date.toLocaleDateString(undefined, { weekday: 'short' }),
                date,
                count,
            };
        });
    }, [threads]);

    const maxActivityCount =
        activityData.reduce((max, item) => Math.max(max, item.count), 0) || 1;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">
                        Forum Management
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Moderate community conversations, curate categories, and keep
                        discussions thriving.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Refreshing…
                            </span>
                        ) : (
                            <>
                                <span aria-hidden="true">⟳</span>
                                Refresh Data
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                        <span aria-hidden="true">＋</span>
                        New Category
                    </button>
                </div>
            </div>

            <CategoryModal
                isOpen={categoryModalOpen}
                onClose={() => {
                    setCategoryModalOpen(false);
                    setEditingCategory(null);
                }}
                onSubmit={handleCategorySubmit}
                initialValues={editingCategory}
                defaultDisplayOrder={categories.length + 1}
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-400">Total Threads</p>
                            <p className="mt-1 text-2xl font-semibold text-white">
                                {numberFormatter(stats.totalThreads)}
                            </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/20 text-lg text-indigo-300">
                            💬
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                        Includes drafts and active discussions across all categories.
                    </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-400">Total Posts</p>
                            <p className="mt-1 text-2xl font-semibold text-white">
                                {numberFormatter(stats.totalPosts)}
                            </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 text-lg text-emerald-300">
                            🧵
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                        Replies and comments contributed across the forum.
                    </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-gray-400">Active Members</p>
                            <p className="mt-1 text-2xl font-semibold text-white">
                                {numberFormatter(stats.activeUsers)}
                            </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 text-lg text-sky-300">
                            👥
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                        Unique contributors participating in current threads.
                    </p>
                </div>

                <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-5 shadow-lg shadow-black/20 backdrop-blur">
                    <p className="text-sm font-medium text-indigo-200">
                        Most Active Categories
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-indigo-100">
                        {mostActiveCategories.length ? (
                            mostActiveCategories.map(category => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between rounded-lg bg-indigo-500/10 px-3 py-2"
                                >
                                    <span className="flex items-center gap-2 font-medium">
                                        <span>{category.icon || '📂'}</span>
                                        {category.name}
                                    </span>
                                    <span className="text-xs text-indigo-200">
                                        {numberFormatter(category.threadCount)} threads
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-indigo-200/70">
                                Create categories to see engagement insights.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/5 bg-gray-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-gray-100">
                        Category Management
                    </h2>
                    <p className="text-sm text-gray-400">
                        Configure how discussions are organized across the forum.
                    </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 text-sm text-gray-200">
                            <thead className="bg-white/5 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-left">Slug</th>
                                    <th className="px-4 py-3 text-center">Threads</th>
                                    <th className="px-4 py-3 text-center">Posts</th>
                                    <th className="px-4 py-3 text-left">Last Activity</th>
                                    <th className="px-4 py-3 text-center">Order</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingCategories ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-6 text-center text-gray-400"
                                        >
                                            Loading categories…
                                        </td>
                                    </tr>
                                ) : categories.length ? (
                                    categories.map((category, index) => {
                                        const lastActivity =
                                            category.lastActivityAt ||
                                            threads.find(
                                                thread => thread.categoryId === category.id
                                            )?.lastActivityAt;
                                        return (
                                            <tr
                                                key={category.id}
                                                className="hover:bg-white/5"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
                                                            {category.icon || '📂'}
                                                        </span>
                                                        <div>
                                                            <p className="font-semibold text-white">
                                                                {category.name}
                                                            </p>
                                                            {category.description && (
                                                                <p className="text-xs text-gray-400">
                                                                    {category.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-gray-300">
                                                    {category.slug}
                                                </td>
                                                <td className="px-4 py-4 text-center text-gray-200">
                                                    {numberFormatter(category.threadCount)}
                                                </td>
                                                <td className="px-4 py-4 text-center text-gray-200">
                                                    {numberFormatter(category.postCount)}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-300">
                                                    {formatRelativeTime(lastActivity)}
                                                </td>
                                                <td className="px-4 py-4 text-center text-gray-300">
                                                    {category.displayOrder ?? index + 1}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                handleMoveCategory(
                                                                    category.id,
                                                                    'up'
                                                                )
                                                            }
                                                            className="rounded-full border border-white/10 p-2 text-xs text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={
                                                                index === 0 ||
                                                                reorderingCategoryId ===
                                                                    category.id
                                                            }
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleMoveCategory(
                                                                    category.id,
                                                                    'down'
                                                                )
                                                            }
                                                            className="rounded-full border border-white/10 p-2 text-xs text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={
                                                                index === categories.length - 1 ||
                                                                reorderingCategoryId ===
                                                                    category.id
                                                            }
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingCategory(category);
                                                                setCategoryModalOpen(true);
                                                            }}
                                                            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteCategory(category)
                                                            }
                                                            className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-6 text-center text-sm text-gray-400"
                                        >
                                            No categories yet. Create your first forum
                                            category to organize discussions.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/5 bg-gray-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">
                            Thread Moderation
                        </h2>
                        <p className="text-sm text-gray-400">
                            Review recent conversations, take action, and keep the forum
                            in top shape.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedCategoryFilter}
                            onChange={e => setSelectedCategoryFilter(e.target.value)}
                            className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                        >
                            <option value="all">All categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.slug}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e =>
                                setStatusFilter(e.target.value as typeof statusFilter)
                            }
                            className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                        >
                            <option value="all">All statuses</option>
                            <option value="pinned">Pinned</option>
                            <option value="locked">Locked</option>
                        </select>
                        <input
                            type="search"
                            value={threadSearchTerm}
                            onChange={e => setThreadSearchTerm(e.target.value)}
                            placeholder="Search by title or author…"
                            className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 md:w-64"
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handleBulkAction('pin')}
                            className="rounded-lg border border-indigo-500/40 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!selectedThreadIds.length || bulkActionLoading}
                        >
                            Pin Selected
                        </button>
                        <button
                            onClick={() => handleBulkAction('lock')}
                            className="rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs font-semibold text-yellow-200 transition hover:bg-yellow-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!selectedThreadIds.length || bulkActionLoading}
                        >
                            Lock Selected
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!selectedThreadIds.length || bulkActionLoading}
                        >
                            Delete Selected
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {selectedThreadIds.length
                            ? `${selectedThreadIds.length} thread(s) selected`
                            : `${filteredThreads.length} thread(s) shown`}
                    </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 text-sm text-gray-200">
                            <thead className="bg-white/5 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-white/20 bg-gray-900 text-indigo-500 focus:ring-indigo-400"
                                            checked={allThreadsSelected}
                                            onChange={toggleSelectAllThreads}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left">Thread</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-center">Replies</th>
                                    <th className="px-4 py-3 text-center">Views</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Last Activity</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingThreads ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-6 text-center text-gray-400"
                                        >
                                            Loading threads…
                                        </td>
                                    </tr>
                                ) : filteredThreads.length ? (
                                    filteredThreads.map(thread => {
                                        const category =
                                            thread.category ||
                                            (thread.categoryId
                                                ? categoryById.get(thread.categoryId)
                                                : undefined);
                                        const lastActivity =
                                            thread.lastActivityAt ||
                                            thread.updatedAt ||
                                            thread.createdAt;

                                        const isEditing = editingThreadId === thread.id;

                                        return (
                                            <Fragment key={thread.id}>
                                                <tr className="hover:bg-white/5">
                                                    <td className="px-4 py-4 align-top">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-white/20 bg-gray-900 text-indigo-500 focus:ring-indigo-400"
                                                            checked={selectedThreadIds.includes(
                                                                thread.id
                                                            )}
                                                            onChange={() =>
                                                                toggleThreadSelection(thread.id)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-white">
                                                                <span className="font-semibold">
                                                                    {thread.title}
                                                                </span>
                                                                {thread.isPinned && (
                                                                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-200">
                                                                        Pinned
                                                                    </span>
                                                                )}
                                                                {thread.isLocked && (
                                                                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-200">
                                                                        Locked
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400">
                                                                {thread.slug}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                by{' '}
                                                                <span className="text-gray-300">
                                                                    {thread.author?.name ||
                                                                        'Unknown'}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-gray-300">
                                                        {category ? (
                                                            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs">
                                                                <span>
                                                                    {category.icon || '📂'}
                                                                </span>
                                                                <span>{category.name}</span>
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-center text-gray-200">
                                                        {numberFormatter(thread.replyCount)}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-center text-gray-200">
                                                        {numberFormatter(thread.viewCount)}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-sm text-gray-300">
                                                        <div className="flex flex-wrap gap-2">
                                                            {thread.isPinned ? (
                                                                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-200">
                                                                    Pinned
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                                                                    Standard
                                                                </span>
                                                            )}
                                                            {thread.isLocked && (
                                                                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-200">
                                                                    Locked
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-sm text-gray-300">
                                                        {formatRelativeTime(lastActivity)}
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-right">
                                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartThreadEdit(thread)
                                                                }
                                                                className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                                            >
                                                                Quick Edit
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/forum/thread/${thread.slug}`
                                                                    )
                                                                }
                                                                className="rounded-lg border border-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                                            >
                                                                View Thread
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await forumApi.togglePinThread(
                                                                            thread.id,
                                                                            !thread.isPinned
                                                                        );
                                                                        addToast(
                                                                            thread.isPinned
                                                                                ? 'Thread unpinned.'
                                                                                : 'Thread pinned.',
                                                                            'success'
                                                                        );
                                                                        await fetchThreads();
                                                                    } catch (error) {
                                                                        console.error(
                                                                            'Failed to toggle pin',
                                                                            error
                                                                        );
                                                                        addToast(
                                                                            'Failed to update pin status.',
                                                                            'error'
                                                                        );
                                                                    }
                                                                }}
                                                                className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                                            >
                                                                {thread.isPinned ? 'Unpin' : 'Pin'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await forumApi.toggleLockThread(
                                                                            thread.id,
                                                                            !thread.isLocked
                                                                        );
                                                                        addToast(
                                                                            thread.isLocked
                                                                                ? 'Thread unlocked.'
                                                                                : 'Thread locked.',
                                                                            'success'
                                                                        );
                                                                        await fetchThreads();
                                                                    } catch (error) {
                                                                        console.error(
                                                                            'Failed to toggle lock',
                                                                            error
                                                                        );
                                                                        addToast(
                                                                            'Failed to update lock status.',
                                                                            'error'
                                                                        );
                                                                    }
                                                                }}
                                                                className="rounded-lg border border-yellow-500/30 px-3 py-1 text-xs font-medium text-yellow-200 transition hover:bg-yellow-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                                                            >
                                                                {thread.isLocked ? 'Unlock' : 'Lock'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {isEditing && (
                                                    <tr className="bg-white/5">
                                                        <td />
                                                        <td colSpan={7} className="px-6 py-5">
                                                            <div className="space-y-4">
                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                    <div>
                                                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
                                                                            Thread Title
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={threadEditValues.title}
                                                                            onChange={e =>
                                                                                setThreadEditValues(
                                                                                    prev => ({
                                                                                        ...prev,
                                                                                        title:
                                                                                            e.target.value,
                                                                                    })
                                                                                )
                                                                            }
                                                                            className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
                                                                            Author
                                                                        </label>
                                                                        <p className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-400">
                                                                            {thread.author?.name ||
                                                                                'Unknown'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
                                                                        Content
                                                                    </label>
                                                                    <textarea
                                                                        value={threadEditValues.content}
                                                                        onChange={e =>
                                                                            setThreadEditValues(prev => ({
                                                                                ...prev,
                                                                                content: e.target.value,
                                                                            }))
                                                                        }
                                                                        rows={5}
                                                                        className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-wrap items-center justify-end gap-3">
                                                                    <button
                                                                        onClick={handleCancelThreadEdit}
                                                                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                                                        disabled={threadEditLoading}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleSaveThreadEdit}
                                                                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
                                                                        disabled={threadEditLoading}
                                                                    >
                                                                        {threadEditLoading ? (
                                                                            <>
                                                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                                                Saving…
                                                                            </>
                                                                        ) : (
                                                                            'Save Changes'
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-6 text-center text-sm text-gray-400"
                                        >
                                            No threads found for the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-gray-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold text-gray-100">
                            Recent Activity
                        </h2>
                        <p className="text-xs text-gray-400">
                            Last 7 days of thread activity
                        </p>
                    </div>
                    <div className="mt-4 flex items-end gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-6">
                        {activityData.map(day => (
                            <div
                                key={day.label}
                                className="flex flex-1 flex-col items-center gap-2"
                            >
                                <div
                                    className="w-8 rounded-full bg-indigo-500/40"
                                    style={{
                                        height: `${(day.count / maxActivityCount) * 100 || 10}%`,
                                        minHeight: day.count ? '16px' : '4px',
                                    }}
                                    title={`${day.count} thread(s)`}
                                />
                                <span className="text-xs text-gray-300">{day.label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-gray-400">
                        Monitor moderation load and plan engagement drives when activity
                        dips.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-gray-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold text-gray-100">
                            Post Moderation
                        </h2>
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                            Coming Soon
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                        Review reported replies and keep the community respectful. This
                        dashboard will aggregate posts flagged by members or automated
                        moderation systems.
                    </p>

                    <div className="mt-4 space-y-3">
                        {loadingFlaggedPosts ? (
                            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-gray-300">
                                Loading flagged posts…
                            </div>
                        ) : flaggedPosts.length ? (
                            flaggedPosts.map(post => (
                                <div
                                    key={post.id}
                                    className="space-y-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                                >
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>
                                            {post.author?.name || 'Anonymous'} •{' '}
                                            {formatRelativeTime(post.createdAt)}
                                        </span>
                                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-200">
                                            Flagged
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-200 line-clamp-3">
                                        {post.content}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                        <button
                                            onClick={() =>
                                                navigate(`/forum/thread/${post.threadId}`)
                                            }
                                            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                        >
                                            Review Thread
                                        </button>
                                        <button
                                            className="rounded-lg border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-gray-300">
                                No flagged posts right now. Great job keeping the community
                                friendly!
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                        Coming soon: AI-assisted moderation, escalation queue, and bulk
                        resolution workflows.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default AdminForumPage;