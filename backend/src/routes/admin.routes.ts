import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication and admin requirement to all admin routes
router.use(authenticate, requireAdmin);

/**
 * Utility: sanitize user object before sending to client
 * Removes commonly sensitive fields if present.
 */
function sanitizeUser(user: any) {
  if (!user) return user;
  const cloned = { ...user } as any;
  // Common sensitive fields to remove if present
  delete cloned.password;
  delete cloned.passwordHash;
  delete cloned.hashedPassword;
  delete cloned.resetToken;
  delete cloned.resetTokenExpiry;
  delete cloned.ssn;
  delete cloned.creditCard;
  delete cloned.cardLast4;
  delete cloned.stripeCustomerId;
  return cloned;
}

/**
 * GET /users
 * Fetch users with pagination, filtering, and sorting
 * Query params:
 *  - page (default 1)
 *  - limit (default 25)
 *  - search (searches name/email)
 *  - role (filter by role)
 *  - sortBy (field)
 *  - sortOrder (asc|desc)
 */
router.get(
  '/users',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
      const skip = (page - 1) * limit;
      const search = (req.query.search as string) || undefined;
      const role = (req.query.role as string) || undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = ((req.query.sortOrder as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { id: { equals: search } },
        ];
      }
      if (role) {
        where.role = role;
      }

      // Total count
      const total = await prisma.user.count({ where });

      // Fetch users with counts of relations
      const users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder as any },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
          updatedAt: true,
          profilePictureUrl: true,
          bio: true,
          // include relation counts when available
          _count: true,
        } as any,
      });

      const sanitized = users.map(sanitizeUser);

      res.json({
        data: sanitized,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /users/:userId
 * Fetch a single user with related data (safely attempts related queries if models exist)
 */
router.get(
  '/users/:userId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionTier: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: true,
        } as any,
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const result: any = { user: sanitizeUser(user) };

      // Dynamically attempt to fetch related resources if present on prisma client
      const anyPrisma: any = prisma as any;
      try {
        if (anyPrisma.savedTool) {
          // Assuming savedTool model exists and has userId FK
          const savedTools = await anyPrisma.savedTool.findMany({
            where: { userId },
            take: 100,
          });
          result.savedTools = savedTools;
        }
      } catch (_) {
        // ignore if model doesn't exist
      }

      try {
        if (anyPrisma.persona) {
          const personas = await anyPrisma.persona.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          });
          result.personas = personas;
        }
      } catch (_) {}

      try {
        if (anyPrisma.chatSession) {
          const sessions = await anyPrisma.chatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          });
          result.chatSessions = sessions;
        }
      } catch (_) {}

      try {
        if (anyPrisma.utilityUsage) {
          const usages = await anyPrisma.utilityUsage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
          });
          result.utilityUsage = usages;
        }
      } catch (_) {}

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /users/:userId
 * Update user's profile, role, subscriptionTier
 */
router.patch(
  '/users/:userId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const {
        name,
        bio,
        role,
        subscriptionTier,
        avatarUrl,
        email,
      } = req.body as {
        name?: string;
        bio?: string;
        role?: string;
        subscriptionTier?: string;
        avatarUrl?: string;
        email?: string;
      };

      // Validate role if provided (basic validation)
      const allowedRoles = ['USER', 'ADMIN', 'MODERATOR'];
      if (role && !allowedRoles.includes(role)) {
        throw new AppError('Invalid role value', 400);
      }

      // Build update data
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (bio !== undefined) data.bio = bio;
      if (role !== undefined) data.role = role;
      if (subscriptionTier !== undefined) data.subscriptionTier = subscriptionTier;
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
      if (email !== undefined) data.email = email;

      if (Object.keys(data).length === 0) {
        throw new AppError('No valid fields provided for update', 400);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionTier: true,
          bio: true,
          avatarUrl: true,
          updatedAt: true,
        } as any,
      });

      // Write audit log if auditLog model exists
      const anyPrisma: any = prisma as any;
      try {
        if (anyPrisma.auditLog) {
          await anyPrisma.auditLog.create({
            data: {
              action: 'USER_UPDATED',
              resourceId: userId,
              resourceType: 'User',
              performedById: req.user?.id,
              meta: JSON.stringify({ changes: data }),
            },
          });
        }
      } catch (_) {
        // silently ignore if auditLog model not present
      }

      res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /users/:userId
 * Soft delete (set deletedAt) if supported, otherwise hard delete
 */
router.delete(
  '/users/:userId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const anyPrisma: any = prisma as any;
      let result: any = null;

      // Try soft delete by setting deletedAt if field exists
      try {
        result = await anyPrisma.user.update({
          where: { id: userId },
          data: { deletedAt: new Date() },
        });
      } catch (err) {
        // If failed (likely no deletedAt field), fallback to hard delete
        try {
          result = await anyPrisma.user.delete({ where: { id: userId } });
        } catch (delErr) {
          // If delete failed because user not found, throw appropriate error
          if ((delErr as any).code === 'P2025') {
            throw new AppError('User not found', 404);
          }
          throw delErr;
        }
      }

      // Audit log
      try {
        if (anyPrisma.auditLog) {
          await anyPrisma.auditLog.create({
            data: {
              action: 'USER_DELETED',
              resourceId: userId,
              resourceType: 'User',
              performedById: req.user?.id,
              meta: JSON.stringify({ method: 'admin.delete' }),
            },
          });
        }
      } catch (_) {}

      res.json({ success: true, user: sanitizeUser(result) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /stats
 * Returns aggregated dashboard statistics for admin
 */
router.get(
  '/stats',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const anyPrisma: any = prisma as any;

      // Basic counts
      const [
        totalUsers,
        proUsers,
        freeUsers,
        totalTools,
        totalWorkflows,
        totalNewsArticles,
        totalForumThreads,
        totalForumPosts,
      ] = await Promise.all([
        prisma.user.count(),
        // pro/free users - try to filter by subscriptionTier if field exists
        (async () => {
          try {
            return await prisma.user.count({ where: { subscriptionTier: 'PRO' } });
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await prisma.user.count({ where: { subscriptionTier: 'FREE' } });
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await anyPrisma.tool.count();
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await anyPrisma.workflow.count();
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await anyPrisma.newsArticle.count();
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await anyPrisma.forumThread.count();
          } catch {
            return 0;
          }
        })(),
        (async () => {
          try {
            return await anyPrisma.forumPost.count();
          } catch {
            return 0;
          }
        })(),
      ]);

      // Total utility usage - attempt to sum a numeric 'units' column if model exists
      let totalUtilityUsage = 0;
      try {
        if (anyPrisma.utilityUsage) {
          const agg: any = await anyPrisma.utilityUsage.aggregate({
            _sum: { units: true as any },
          });
          totalUtilityUsage = (agg && agg._sum && agg._sum.units) || 0;
        }
      } catch {
        totalUtilityUsage = 0;
      }

      // Revenue metrics: Try to summarize payments if payments/orders model exists
      let mrr = null;
      let totalRevenue = null;
      try {
        if (anyPrisma.subscription) {
          // Example: sum current_period_amount or monthly_amount fields
          const subscriptions = await anyPrisma.subscription.findMany({
            where: { status: 'active' },
            select: { monthlyAmount: true },
          });
          mrr = subscriptions.reduce((s: number, sub: any) => s + (sub.monthlyAmount || 0), 0);
        } else if (anyPrisma.payment) {
          const agg: any = await anyPrisma.payment.aggregate({ _sum: { amount: true } });
          totalRevenue = (agg && agg._sum && agg._sum.amount) || 0;
          // rough MRR: sum of recurring payments in last 30 days (best-effort)
          const recurring = await anyPrisma.payment.findMany({
            where: { recurring: true, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            select: { amount: true },
          });
          mrr = recurring.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        }
      } catch {
        mrr = mrr ?? null;
        totalRevenue = totalRevenue ?? null;
      }

      // User growth trends - daily signups for last 30 days
      const days = 30;
      const today = new Date();
      const signupsByDay: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i, 0, 0, 0));
        const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i + 1, 0, 0, 0));
        // Use count with createdAt range
        try {
          const count = await prisma.user.count({
            where: {
              createdAt: {
                gte: start,
                lt: end,
              },
            } as any,
          });
          signupsByDay.push({ date: start.toISOString().slice(0, 10), count });
        } catch {
          signupsByDay.push({ date: start.toISOString().slice(0, 10), count: 0 });
        }
      }

      res.json({
        totalUsers,
        proUsers,
        freeUsers,
        totalTools,
        totalWorkflows,
        totalNewsArticles,
        totalForumThreads,
        totalForumPosts,
        totalUtilityUsage,
        mrr,
        totalRevenue,
        userGrowth: signupsByDay,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/summary
 * Aggregated analytics data from stored events (if AnalyticsEvent model exists)
 */
router.get(
  '/analytics/summary',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const anyPrisma: any = prisma as any;
      // Fallback empty summary
      const summary: any = {
        totalEvents: 0,
        topEvents: [],
        topPages: [],
        activeUsers: 0,
        eventsByDay: [],
      };

      try {
        if (anyPrisma.analyticsEvent) {
          const totalEvents = await anyPrisma.analyticsEvent.count();
          summary.totalEvents = totalEvents;

          // Top events
          const topEvents = await anyPrisma.analyticsEvent.groupBy({
            by: ['eventName'],
            _count: { eventName: true },
            orderBy: { _count: { eventName: 'desc' } },
            take: 10,
          });
          summary.topEvents = topEvents.map((t: any) => ({ eventName: t.eventName, count: t._count.eventName }));

          // Top pages
          const topPages = await anyPrisma.analyticsEvent.groupBy({
            by: ['page'],
            _count: { page: true },
            orderBy: { _count: { page: 'desc' } },
            take: 10,
          });
          summary.topPages = topPages.map((p: any) => ({ page: p.page, count: p._count.page }));

          // Active users in last 30 minutes
          const since = new Date(Date.now() - 30 * 60 * 1000);
          const activeUsers = await anyPrisma.analyticsEvent.findMany({
            where: { createdAt: { gte: since } },
            select: { userId: true },
            distinct: ['userId'],
          });
          summary.activeUsers = (activeUsers && activeUsers.length) || 0;

          // Events by day for last 30 days
          const days = 30;
          const today = new Date();
          const eventsByDay: { date: string; count: number }[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 0, 0, 0);
            const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i + 1, 0, 0, 0);
            const count = await anyPrisma.analyticsEvent.count({
              where: { createdAt: { gte: start, lt: end } },
            });
            eventsByDay.push({ date: start.toISOString().slice(0, 10), count });
          }
          summary.eventsByDay = eventsByDay;
        }
      } catch {
        // If analyticsEvent model doesn't exist, return defaults
      }

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /audit-logs
 * Fetch audit logs with pagination and filtering
 * Query params: page, limit, action, resourceType, resourceId, userId, sortOrder
 */
router.get(
  '/audit-logs',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const anyPrisma: any = prisma as any;
      // If auditLog model not present, return empty
      if (!anyPrisma.auditLog) {
        return res.json({ data: [], pagination: { page: 1, limit: 0, total: 0 } });
      }

      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
      const skip = (page - 1) * limit;
      const action = (req.query.action as string) || undefined;
      const resourceType = (req.query.resourceType as string) || undefined;
      const resourceId = (req.query.resourceId as string) || undefined;
      const userId = (req.query.userId as string) || undefined;
      const sortOrder = ((req.query.sortOrder as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where: any = {};
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (resourceId) where.resourceId = resourceId;
      if (userId) where.performedById = userId;

      const total = await anyPrisma.auditLog.count({ where });
      const logs = await anyPrisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
      });

      res.json({
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /system-health
 * Returns basic system metrics: DB connectivity, uptime, memory usage, placeholder for API response times and error rates
 */
router.get(
  '/system-health',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let dbConnected = false;
      try {
        // Lightweight DB check - SELECT 1 using prisma.$queryRaw
        // Use a safe raw query to validate connection
        // The exact raw query may vary by DB provider; SELECT 1 works for Postgres/MySQL/SQLite
        // We use $queryRawUnsafe as a fallback to remain generic
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await (prisma as any).$queryRawUnsafe('SELECT 1');
        dbConnected = true;
      } catch {
        dbConnected = false;
      }

      const mem = process.memoryUsage();
      const uptimeSeconds = process.uptime();
      const uptimeMs = Math.round(uptimeSeconds * 1000);

      // Placeholder values for API response time and error rate - in future integrate with monitoring system
      const apiResponseTimeMs = null;
      const errorRate = null;

      res.json({
        database: {
          connected: dbConnected,
        },
        server: {
          uptimeMs,
          memory: {
            rss: mem.rss,
            heapTotal: mem.heapTotal,
            heapUsed: mem.heapUsed,
            external: mem.external,
          },
          pid: process.pid,
          nodeVersion: process.version,
          timestamp: new Date().toISOString(),
        },
        apiResponseTimeMs,
        errorRate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export the router as default
export default router;