import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const authorSelect = {
  id: true,
  name: true,
  profilePictureUrl: true,
  role: true,
};

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type ThreadSortOption = 'latest' | 'views' | 'newest' | 'replies';

const isAdminUser = (req: AuthRequest): boolean => {
  const role = req.user?.role;
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

const slugifyString = (value: string): string => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base.length > 0 ? base.slice(0, 96) : 'thread';
};

const generateUniqueThreadSlug = async (title: string, excludeId?: string): Promise<string> => {
  const baseSlug = slugifyString(title);
  let slugCandidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.forumThread.findFirst({
      where: excludeId
        ? {
            slug: slugCandidate,
            NOT: { id: excludeId },
          }
        : { slug: slugCandidate },
      select: { id: true },
    });

    if (!existing) {
      return slugCandidate;
    }

    suffix += 1;
    const suffixText = `-${suffix}`;
    const truncatedBase = baseSlug.slice(0, 96 - suffixText.length);
    slugCandidate = `${truncatedBase}${suffixText}`;
  }
};

const parsePaginationParams = (
  pageParam: string | undefined,
  limitParam: string | undefined,
) => {
  let page = Number.parseInt(pageParam ?? '', 10);
  let limit = Number.parseInt(limitParam ?? '', 10);

  if (Number.isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (Number.isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  limit = Math.min(limit, MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const parseSortOption = (sortParam?: string): ThreadSortOption => {
  switch ((sortParam ?? '').toLowerCase()) {
    case 'views':
    case 'most_viewed':
      return 'views';
    case 'newest':
      return 'newest';
    case 'replies':
    case 'most_replies':
      return 'replies';
    default:
      return 'latest';
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.forumCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const categoryStats = await prisma.forumThread.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
      _sum: { replyCount: true },
      _max: { lastActivityAt: true },
    });

    const statsMap = new Map<
      string,
      { threadCount: number; replySum: number; lastActivityAt: Date | null }
    >();

    categoryStats.forEach((stat) => {
      statsMap.set(stat.categoryId, {
        threadCount: stat._count._all,
        replySum: stat._sum.replyCount ?? 0,
        lastActivityAt: stat._max.lastActivityAt ?? null,
      });
    });

    const result = categories.map((category) => {
      const stats = statsMap.get(category.id) ?? {
        threadCount: 0,
        replySum: 0,
        lastActivityAt: null,
      };

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        threadCount: stats.threadCount,
        postCount: stats.threadCount + stats.replySum,
        lastActivityAt: stats.lastActivityAt,
      };
    });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getThreadsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categorySlug } = req.params;
    if (!categorySlug) {
      throw new AppError('Category slug is required', 400);
    }

    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true, description: true, icon: true },
    });

    if (!category) {
      throw new AppError('Forum category not found', 404);
    }

    const { page, limit, skip } = parsePaginationParams(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
    );

    const sortOption = parseSortOption(req.query.sort as string | undefined);

    const orderBy: Prisma.ForumThreadOrderByWithRelationInput[] = [{ isPinned: 'desc' }];

    switch (sortOption) {
      case 'views':
        orderBy.push({ viewCount: 'desc' }, { lastActivityAt: 'desc' });
        break;
      case 'newest':
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'replies':
        orderBy.push({ replyCount: 'desc' }, { lastActivityAt: 'desc' });
        break;
      case 'latest':
      default:
        orderBy.push({ lastActivityAt: 'desc' });
        break;
    }

    const [threads, total] = await Promise.all([
      prisma.forumThread.findMany({
        where: { categoryId: category.id },
        skip,
        take: limit,
        orderBy,
        include: {
          author: { select: authorSelect },
        },
      }),
      prisma.forumThread.count({
        where: { categoryId: category.id },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        category,
        threads,
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getThreadBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { threadSlug } = req.params;
    if (!threadSlug) {
      throw new AppError('Thread slug is required', 400);
    }

    const thread = await prisma.forumThread.findUnique({
      where: { slug: threadSlug },
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const { page, limit, skip } = parsePaginationParams(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
    );

    const [updatedThread, posts, totalPosts] = await prisma.$transaction([
      prisma.forumThread.update({
        where: { id: thread.id },
        data: { viewCount: { increment: 1 } },
        include: {
          author: { select: authorSelect },
          category: { select: categorySelect },
        },
      }),
      prisma.forumPost.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: { select: authorSelect },
        },
      }),
      prisma.forumPost.count({
        where: { threadId: thread.id },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        thread: updatedThread,
        posts,
        pagination: {
          page,
          limit,
          total: totalPosts,
          totalPages: totalPosts === 0 ? 0 : Math.ceil(totalPosts / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to create a thread', 401);
    }

    const { categorySlug, title, content } = req.body as {
      categorySlug?: string;
      title?: string;
      content?: string;
    };

    if (!categorySlug || typeof categorySlug !== 'string') {
      throw new AppError('Category slug is required', 400);
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      throw new AppError('Thread title must be at least 3 characters long', 400);
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      throw new AppError('Thread content must be at least 10 characters long', 400);
    }

    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });

    if (!category) {
      throw new AppError('Forum category not found', 404);
    }

    const slug = await generateUniqueThreadSlug(title.trim());
    const now = new Date();

    const thread = await prisma.forumThread.create({
      data: {
        title: title.trim(),
        slug,
        content: content.trim(),
        categoryId: category.id,
        authorId: req.user.id,
        lastActivityAt: now,
        replyCount: 0,
      },
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    res.status(201).json({
      status: 'success',
      data: thread,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(
        new AppError('A thread with a similar slug already exists. Please choose another title.', 409),
      );
    }
    next(error);
  }
};

export const updateThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to update a thread', 401);
    }

    const { threadId } = req.params;
    if (!threadId) {
      throw new AppError('Thread ID is required', 400);
    }

    const existingThread = await prisma.forumThread.findUnique({
      where: { id: threadId },
    });

    if (!existingThread) {
      throw new AppError('Thread not found', 404);
    }

    if (existingThread.authorId !== req.user.id && !isAdminUser(req)) {
      throw new AppError('You do not have permission to update this thread', 403);
    }

    const { title, content } = req.body as { title?: string; content?: string };

    if ((!title || !title.trim()) && (!content || !content.trim())) {
      throw new AppError('No valid fields provided for update', 400);
    }

    const data: Prisma.ForumThreadUpdateInput = {};
    if (title && title.trim()) {
      const trimmedTitle = title.trim();
      data.title = trimmedTitle;

      if (trimmedTitle !== existingThread.title) {
        data.slug = await generateUniqueThreadSlug(trimmedTitle, existingThread.id);
      }
    }

    if (content && content.trim()) {
      data.content = content.trim();
    }

    const updatedThread = await prisma.forumThread.update({
      where: { id: threadId },
      data,
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    res.json({
      status: 'success',
      data: updatedThread,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to delete a thread', 401);
    }

    const { threadId } = req.params;
    if (!threadId) {
      throw new AppError('Thread ID is required', 400);
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true },
    });

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    if (thread.authorId !== req.user.id && !isAdminUser(req)) {
      throw new AppError('You do not have permission to delete this thread', 403);
    }

    await prisma.forumThread.delete({
      where: { id: threadId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to reply to a thread', 401);
    }

    const { threadId } = req.params;
    if (!threadId) {
      throw new AppError('Thread ID is required', 400);
    }

    const { content } = req.body as { content?: string };
    if (!content || typeof content !== 'string' || content.trim().length < 2) {
      throw new AppError('Reply content must be at least 2 characters long', 400);
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    });

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    if (thread.isLocked) {
      throw new AppError('This thread is locked. No new replies can be added.', 403);
    }

    const post = await prisma.$transaction(async (tx) => {
      const createdPost = await tx.forumPost.create({
        data: {
          content: content.trim(),
          threadId: thread.id,
          authorId: req.user!.id,
        },
        include: {
          author: { select: authorSelect },
        },
      });

      await tx.forumThread.update({
        where: { id: thread.id },
        data: {
          replyCount: { increment: 1 },
          lastActivityAt: createdPost.createdAt,
        },
      });

      return createdPost;
    });

    res.status(201).json({
      status: 'success',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to update a reply', 401);
    }

    const { postId } = req.params;
    if (!postId) {
      throw new AppError('Post ID is required', 400);
    }

    const { content } = req.body as { content?: string };
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AppError('Reply content cannot be empty', 400);
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    if (post.authorId !== req.user.id && !isAdminUser(req)) {
      throw new AppError('You do not have permission to update this reply', 403);
    }

    const updatedPost = await prisma.forumPost.update({
      where: { id: postId },
      data: {
        content: content.trim(),
        isEdited: true,
      },
      include: {
        author: { select: authorSelect },
      },
    });

    res.json({
      status: 'success',
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to delete a reply', 401);
    }

    const { postId } = req.params;
    if (!postId) {
      throw new AppError('Post ID is required', 400);
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true } },
        thread: { select: { id: true, createdAt: true } },
      },
    });

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    if (post.author.id !== req.user.id && !isAdminUser(req)) {
      throw new AppError('You do not have permission to delete this reply', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.forumPost.delete({
        where: { id: postId },
      });

      const latestPost = await tx.forumPost.findFirst({
        where: { threadId: post.thread.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      await tx.forumThread.update({
        where: { id: post.thread.id },
        data: {
          replyCount: { decrement: 1 },
          lastActivityAt: latestPost?.createdAt ?? post.thread.createdAt,
        },
      });
    });

    res.json({
      status: 'success',
      message: 'Reply deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const togglePinThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges are required to pin threads', 403);
    }

    const { threadId } = req.params;
    if (!threadId) {
      throw new AppError('Thread ID is required', 400);
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, isPinned: true },
    });

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const updatedThread = await prisma.forumThread.update({
      where: { id: threadId },
      data: { isPinned: !thread.isPinned },
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    res.json({
      status: 'success',
      data: updatedThread,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleLockThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges are required to lock threads', 403);
    }

    const { threadId } = req.params;
    if (!threadId) {
      throw new AppError('Thread ID is required', 400);
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    });

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const updatedThread = await prisma.forumThread.update({
      where: { id: threadId },
      data: { isLocked: !thread.isLocked },
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    res.json({
      status: 'success',
      data: updatedThread,
    });
  } catch (error) {
    next(error);
  }
};

// Admin endpoints
export const getAdminThreads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    const { categorySlug, status, search, limit } = req.query;
    const take = limit ? Math.min(Number(limit), MAX_LIMIT) : 100;

    const where: Prisma.ForumThreadWhereInput = {};

    if (categorySlug && typeof categorySlug === 'string') {
      const category = await prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (status === 'pinned') {
      where.isPinned = true;
    } else if (status === 'locked') {
      where.isLocked = true;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { author: { name: { contains: search } } },
      ];
    }

    const threads = await prisma.forumThread.findMany({
      where,
      take,
      orderBy: { lastActivityAt: 'desc' },
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
      },
    });

    res.json({
      status: 'success',
      data: { threads, total: threads.length },
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    const { name, slug, description, icon, displayOrder } = req.body;

    const category = await prisma.forumCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        displayOrder: displayOrder || 999,
      },
    });

    res.status(201).json({
      status: 'success',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    const { categoryId } = req.params;
    const { name, slug, description, icon, displayOrder } = req.body;

    const data: Prisma.ForumCategoryUpdateInput = {};
    if (name) data.name = name;
    if (slug) data.slug = slug;
    if (description !== undefined) data.description = description || null;
    if (icon !== undefined) data.icon = icon || null;
    if (displayOrder !== undefined) data.displayOrder = displayOrder;

    const category = await prisma.forumCategory.update({
      where: { id: categoryId },
      data,
    });

    res.json({
      status: 'success',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    const { categoryId } = req.params;

    await prisma.forumCategory.delete({
      where: { id: categoryId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateThreads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    const { ids, isPinned, isLocked } = req.body;

    const data: Prisma.ForumThreadUpdateManyMutationInput = {};
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (isLocked !== undefined) data.isLocked = isLocked;

    await prisma.forumThread.updateMany({
      where: { id: { in: ids } },
      data,
    });

    res.json({
      status: 'success',
      message: `${ids.length} thread(s) updated successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const getFlaggedPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !isAdminUser(req)) {
      throw new AppError('Administrator privileges required', 403);
    }

    // For now, return empty array as flagging system isn't implemented yet
    res.json({
      status: 'success',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};
