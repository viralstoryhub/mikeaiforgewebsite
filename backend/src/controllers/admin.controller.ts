import { Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

const parsePositiveInt = (value: unknown, defaultValue: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.floor(parsed);
};

const sanitizeUser = <T extends Record<string, any>>(user: T): Omit<T, 'password' | 'resetPasswordToken' | 'emailVerificationToken'> => {
  const { password, resetPasswordToken, emailVerificationToken, ...rest } = user;
  return rest;
};

const sanitizeAnalyticsEvent = <T extends Record<string, any>>(event: T): Omit<T, 'ipAddress' | 'userAgent'> => {
  const { ipAddress, userAgent, ...rest } = event;
  return rest as Omit<T, 'ipAddress' | 'userAgent'>;
};

const allowedUserSortFields = new Set<keyof Prisma.UserOrderByWithRelationInput>([
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'lastLoginAt',
  'subscriptionTier',
  'role',
]);

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search,
      role,
      subscriptionTier,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = parsePositiveInt(page, 1);
    const perPage = parsePositiveInt(pageSize, 20);

    const where: Prisma.UserWhereInput = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && typeof role === 'string') {
      where.role = role.toUpperCase();
    }

    if (subscriptionTier && typeof subscriptionTier === 'string') {
      where.subscriptionTier = subscriptionTier.toUpperCase();
    }

    const orderField = typeof sortBy === 'string' && allowedUserSortFields.has(sortBy as keyof Prisma.UserOrderByWithRelationInput)
      ? sortBy
      : 'createdAt';

    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (pageNumber - 1) * perPage,
        take: perPage,
        orderBy: { [orderField]: orderDirection },
        include: {
          _count: {
            select: {
              savedTools: true,
              utilityUsage: true,
              personas: true,
              chatSessions: true,
            },
          },
          utilityUsage: {
            select: {
              utilitySlug: true,
              count: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((user) => {
      const { _count, utilityUsage, ...rest } = user;
      const totalUtilityUsage = utilityUsage.reduce((acc, item) => acc + item.count, 0);
      const utilityUsageBreakdown = utilityUsage.reduce<Record<string, number>>((acc, item) => {
        acc[item.utilitySlug] = item.count;
        return acc;
      }, {});

      return {
        ...sanitizeUser(rest),
        savedToolsCount: _count.savedTools,
        utilityUsageCount: _count.utilityUsage,
        personasCount: _count.personas,
        chatSessionsCount: _count.chatSessions,
        totalUtilityUsage,
        utilityUsageBreakdown,
      };
    });

    const totalPages = Math.ceil(total / perPage) || 1;

    res.json({
      data,
      meta: {
        page: pageNumber,
        pageSize: perPage,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        savedTools: true,
        utilityUsage: true,
        personas: true,
        chatSessions: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 100,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        apiKeys: true,
        forumThreads: true,
        forumPosts: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_ROLES = ['USER', 'ADMIN', 'MODERATOR', 'EDITOR', 'MANAGER', 'SUPPORT'];

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { name, bio, role, subscriptionTier } = req.body ?? {};

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (!ALLOWED_ROLES.includes(normalizedRole)) {
        throw new AppError(`Invalid role: ${role}`, 400);
      }

      if (req.user?.id === userId && normalizedRole !== 'ADMIN') {
        throw new AppError('Admins cannot revoke their own admin access', 400);
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (typeof name === 'string') {
      data.name = name.trim();
    }

    if (typeof bio === 'string') {
      data.bio = bio.trim();
    }

    if (role) {
      data.role = String(role).toUpperCase();
    }

    if (subscriptionTier) {
      data.subscriptionTier = String(subscriptionTier).toUpperCase();
    }

    if (Object.keys(data).length === 0) {
      throw new AppError('No valid fields provided for update', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'UPDATE_USER',
        resource: 'User',
        details: JSON.stringify({
          targetUserId: userId,
          updatedFields: Object.keys(data),
        }),
      },
    });

    res.json({
      data: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (req.user?.id === userId) {
      throw new AppError('Admins cannot delete their own account', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.savedTool.deleteMany({ where: { userId } });
      await tx.utilityUsage.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.chatMessage.deleteMany({
        where: {
          session: {
            userId,
          },
        },
      });
      await tx.chatSession.deleteMany({ where: { userId } });
      await tx.aIPersona.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id ?? null,
          action: 'DELETE_USER',
          resource: 'User',
          details: JSON.stringify({
            deletedUserId: existingUser.id,
            deletedUserEmail: existingUser.email,
            deletedUserName: existingUser.name,
            deletedUserRole: existingUser.role,
          }),
        },
      });
    });

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      proUsers,
      freeUsers,
      newUsers7Days,
      newUsers30Days,
      totalTools,
      totalWorkflows,
      totalNewsArticles,
      totalForumThreads,
      totalForumPosts,
      utilityUsageAggregate,
      recentUsers,
      stripeSubscribers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
      prisma.user.count({ where: { subscriptionTier: 'FREE' } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.tool.count(),
      prisma.workflow.count(),
      prisma.newsArticle.count(),
      prisma.forumThread.count(),
      prisma.forumPost.count(),
      prisma.utilityUsage.aggregate({
        _sum: { count: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.user.count({
        where: {
          OR: [
            { stripeSubscriptionId: { not: null } },
            { stripeCustomerId: { not: null } },
          ],
        },
      }),
    ]);

    const totalUtilityUsage = utilityUsageAggregate._sum.count ?? 0;

    const growthMap = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      growthMap.set(key, 0);
    }

    for (const user of recentUsers) {
      const key = user.createdAt.toISOString().slice(0, 10);
      if (growthMap.has(key)) {
        growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
      }
    }

    const userGrowthTrend = Array.from(growthMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const currency = (process.env.STRIPE_DEFAULT_CURRENCY ?? 'usd').toLowerCase();

    const revenueMetrics = {
      hasStripeData: stripeSubscribers > 0,
      payingCustomers: stripeSubscribers,
      mrr: null as number | null,
      totalRevenue: null as number | null,
      currency,
      note: stripeSubscribers > 0
        ? 'Stripe data detected but detailed revenue metrics require invoice integration.'
        : 'No Stripe subscription data available.',
    };

    res.json({
      data: {
        users: {
          total: totalUsers,
          pro: proUsers,
          free: freeUsers,
          newInLast7Days: newUsers7Days,
          newInLast30Days: newUsers30Days,
          growthTrend: userGrowthTrend,
        },
        content: {
          tools: totalTools,
          workflows: totalWorkflows,
          newsArticles: totalNewsArticles,
          forumThreads: totalForumThreads,
          forumPosts: totalForumPosts,
        },
        usage: {
          totalUtilityUsage,
          averageUtilityUsagePerUser: totalUsers > 0 ? totalUtilityUsage / totalUsers : 0,
        },
        revenue: revenueMetrics,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalEvents, distinctUsers, topEvents, topPages, eventsByDay, recentEvents] = await Promise.all([
      prisma.analyticsEvent.count(),
      prisma.analyticsEvent.findMany({
        where: { userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['eventName'],
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['page'],
        where: { page: { not: null } },
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.analyticsEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const uniqueUsersCount = distinctUsers.length;
    const eventsPerUser = uniqueUsersCount > 0 ? totalEvents / uniqueUsersCount : null;

    const dailyEvents = eventsByDay.reduce<Record<string, number>>((acc, item) => {
      const dateKey = item.createdAt.toISOString().slice(0, 10);
      acc[dateKey] = (acc[dateKey] ?? 0) + (item._count?.id ?? 0);
      return acc;
    }, {});

    res.json({
      data: {
        totals: {
          events: totalEvents,
          uniqueUsers: uniqueUsersCount,
          eventsPerUser,
        },
        topEvents: topEvents.map((item) => ({
          eventName: item.eventName,
          count: item._count?.eventName ?? 0,
        })),
        topPages: topPages
          .filter((item) => item.page)
          .map((item) => ({
            page: item.page,
            count: item._count?.page ?? 0,
          })),
        dailyEvents,
        recentEvents: recentEvents.map(sanitizeAnalyticsEvent),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      action,
      resource,
      userId,
      search,
    } = req.query;

    const pageNumber = parsePositiveInt(page, 1);
    const perPage = parsePositiveInt(pageSize, 20);

    const where: Prisma.AuditLogWhereInput = {};

    if (action && typeof action === 'string') {
      where.action = { equals: action, mode: 'insensitive' };
    }

    if (resource && typeof resource === 'string') {
      where.resource = { equals: resource, mode: 'insensitive' };
    }

    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (pageNumber - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      meta: {
        page: pageNumber,
        pageSize: perPage,
        total,
        totalPages: Math.ceil(total / perPage) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const start = Date.now();
    let databaseStatus: 'connected' | 'degraded' | 'disconnected' = 'connected';
    let latencyMs: number | null = null;

    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      latencyMs = Date.now() - start;
    } catch (error) {
      const elapsed = Date.now() - start;
      latencyMs = elapsed > 0 ? elapsed : null;

      if (
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientRustPanicError
      ) {
        databaseStatus = 'disconnected';
      } else {
        databaseStatus = 'degraded';
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [auditLogsLastHour, errorLogsLastHour] = await Promise.all([
      prisma.auditLog.count({
        where: {
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: oneHourAgo },
          OR: [
            { action: { contains: 'ERROR', mode: 'insensitive' } },
            { action: { contains: 'EXCEPTION', mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const errorRate = auditLogsLastHour > 0 ? (errorLogsLastHour / auditLogsLastHour) * 100 : 0;

    const memoryUsage = process.memoryUsage();

    res.json({
      data: {
        status: databaseStatus === 'connected' ? 'healthy' : databaseStatus === 'degraded' ? 'warning' : 'critical',
        timestamp: new Date().toISOString(),
        database: {
          status: databaseStatus,
          latencyMs,
        },
        uptime: {
          seconds: process.uptime(),
          humanReadable: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        },
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
        },
        errors: {
          lastHourCount: errorLogsLastHour,
          lastHourRate: Number(errorRate.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats,
  getAnalyticsSummary,
  getAuditLogs,
  getSystemHealth,
};
