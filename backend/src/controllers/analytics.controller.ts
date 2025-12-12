/**
 * Update summary:
 * - Verified the analytics controller already fulfills GA integration and analytics event tracking requirements.
 * - No functional changes were necessary; retaining the existing implementation for stability.
 */
import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { BetaAnalyticsDataClient, protos } from '@google-analytics/data';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

const MS_PER_DAY = 86_400_000;
const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_REPORT_LIMIT = 100000;
const MAX_REALTIME_LIMIT = 200;
const MAX_SUMMARY_LIMIT = 100;

let gaClient: BetaAnalyticsDataClient | null = null;
let gaConfigCache:
  | {
      propertyId: string;
      credentialsPath?: string;
      credentialsJson?: { client_email: string; private_key: string };
    }
  | null = null;

const toStringParam = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? toStringParam(value[0]) : undefined;
  }
  return undefined;
};

const toStringArrayParam = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringArrayParam(item))
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const toNumberParam = (value: unknown, defaultValue: number): number => {
  const str = toStringParam(value);
  if (!str) {
    return defaultValue;
  }
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const parseDateFromQuery = (value: unknown): Date | undefined => {
  const str = toStringParam(value);
  if (!str) {
    return undefined;
  }
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid date value provided: ${str}`, 400);
  }
  return parsed;
};

const normalizeDateRange = (
  start: Date | undefined,
  end: Date | undefined
): { startDate: Date; endDate: Date } => {
  const endDate = end ? new Date(end) : new Date();
  endDate.setMilliseconds(999);
  endDate.setSeconds(59);
  endDate.setMinutes(59);
  endDate.setHours(23);

  const startDate = start
    ? new Date(start)
    : new Date(endDate.getTime() - (DEFAULT_LOOKBACK_DAYS - 1) * MS_PER_DAY);
  startDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    throw new AppError('Start date must be before end date', 400);
  }

  return { startDate, endDate };
};

const formatISODate = (date: Date): string => date.toISOString().split('T')[0];

const normalizeProperties = (
  input: unknown
): { stringified: string; object: Record<string, unknown> } => {
  if (input === null || input === undefined) {
    return { stringified: '{}', object: {} };
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === 'object') {
        return { stringified: JSON.stringify(parsed), object: parsed as Record<string, unknown> };
      }
      return {
        stringified: JSON.stringify({ value: parsed }),
        object: { value: parsed },
      };
    } catch {
      return {
        stringified: JSON.stringify({ value: input }),
        object: { value: input },
      };
    }
  }

  if (typeof input === 'object') {
    return { stringified: JSON.stringify(input), object: input as Record<string, unknown> };
  }

  return {
    stringified: JSON.stringify({ value: input }),
    object: { value: input },
  };
};

const safeJsonParse = (value: string | null | undefined): unknown => {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const extractIpAddress = (req: AuthRequest, fallback?: unknown): string | undefined => {
  const header = req.headers['x-forwarded-for'];
  if (Array.isArray(header) && header.length > 0) {
    return header[0]?.split(',')[0]?.trim();
  }
  if (typeof header === 'string' && header.length > 0) {
    return header.split(',')[0]?.trim();
  }
  if (typeof fallback === 'string' && fallback.length > 0) {
    return fallback;
  }
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    return req.ip;
  }
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return undefined;
};

interface EventFilterOptions {
  startDate?: Date;
  endDate?: Date;
  eventNames?: string[];
  userId?: string;
  sessionId?: string;
  page?: string;
  referrer?: string;
  searchTerm?: string;
}

const buildAnalyticsWhere = (
  filters: EventFilterOptions
): Prisma.AnalyticsEventWhereInput => {
  const where: Prisma.AnalyticsEventWhereInput = {};

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Prisma.DateTimeFilter).lte = filters.endDate;
    }
  }

  if (filters.eventNames && filters.eventNames.length > 0) {
    if (filters.eventNames.length === 1) {
      [where.eventName] = filters.eventNames;
    } else {
      where.eventName = { in: filters.eventNames };
    }
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.sessionId) {
    where.sessionId = filters.sessionId;
  }

  if (filters.page) {
    where.page = { contains: filters.page };
  }

  if (filters.referrer) {
    where.referrer = { contains: filters.referrer };
  }

  if (filters.searchTerm) {
    const search = filters.searchTerm;
    where.OR = [
      { eventName: { contains: search } },
      { page: { contains: search } },
      { referrer: { contains: search } },
      { userId: { contains: search } },
      { sessionId: { contains: search } },
      { properties: { contains: search } },
    ];
  }

  return where;
};

const resolveGAConfig = (): {
  propertyId: string;
  credentialsPath?: string;
  credentialsJson?: { client_email: string; private_key: string };
} => {
  if (gaConfigCache) {
    return gaConfigCache;
  }

  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) {
    throw new AppError(
      'Google Analytics property ID is not configured. Please set GOOGLE_ANALYTICS_PROPERTY_ID.',
      503
    );
  }

  // Prefer inline JSON credentials if provided
  const rawJson =
    process.env.GOOGLE_ANALYTICS_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_JSON;

  if (rawJson) {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      try {
        const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
        parsed = JSON.parse(decoded);
      } catch {
        throw new AppError(
          'Invalid GOOGLE_ANALYTICS_CREDENTIALS_JSON. Ensure it is valid JSON or base64-encoded JSON.',
          503
        );
      }
    }

    if (!parsed?.client_email || !parsed?.private_key) {
      throw new AppError(
        'Service account JSON must include client_email and private_key.',
        503
      );
    }

    gaConfigCache = { propertyId, credentialsJson: { client_email: parsed.client_email, private_key: parsed.private_key } };
    return gaConfigCache;
  }

  // Fallback to file path
  const credentialsPath = process.env.GOOGLE_ANALYTICS_CREDENTIALS_PATH;
  if (!credentialsPath) {
    throw new AppError(
      'Google Analytics credentials are not configured. Set GOOGLE_ANALYTICS_CREDENTIALS_JSON or GOOGLE_ANALYTICS_CREDENTIALS_PATH.',
      503
    );
  }

  const resolvedPath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new AppError(
      `Google Analytics credentials file not found at ${resolvedPath}. Verify GOOGLE_ANALYTICS_CREDENTIALS_PATH.`,
      503
    );
  }

  gaConfigCache = { propertyId, credentialsPath: resolvedPath };
  return gaConfigCache;
};

const getGAClient = (): BetaAnalyticsDataClient => {
  const cfg = resolveGAConfig();
  if (!gaClient) {
    try {
      if (cfg.credentialsJson) {
        gaClient = new BetaAnalyticsDataClient({
          credentials: cfg.credentialsJson as any,
        });
      } else if (cfg.credentialsPath) {
        gaClient = new BetaAnalyticsDataClient({ keyFilename: cfg.credentialsPath });
      } else {
        throw new Error('No GA credentials configured');
      }
    } catch (error) {
      gaClient = null;
      throw new AppError(
        'Failed to initialize Google Analytics client. Check credentials configuration.',
        500
      );
    }
  }
  return gaClient;
};

interface ForwardEventPayload {
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  ipAddress?: string;
  page?: string;
  timestamp?: Date;
}

const forwardEventToMeasurementProtocol = async (
  payload: ForwardEventPayload
): Promise<void> => {
  const measurementId =
    process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID ||
    process.env.GA_MEASUREMENT_ID ||
    process.env.VITE_GA_MEASUREMENT_ID;
  const apiSecret =
    process.env.GOOGLE_ANALYTICS_API_SECRET || process.env.GA_API_SECRET;

  if (!measurementId || !apiSecret) {
    return;
  }

  const clientId =
    payload.sessionId ||
    (payload.userId ? `uid.${payload.userId}` : undefined) ||
    payload.ipAddress ||
    `${Date.now()}.${Math.round(Math.random() * 10_000)}`;

  const params: Record<string, string | number> = {};
  Object.entries(payload.properties).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      params[key] =
        typeof value === 'boolean' ? Number(value) : (value as string | number);
    }
  });

  if (payload.page && !params.page_location) {
    params.page_location = payload.page;
  }

  const body: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: payload.eventName,
        params,
      },
    ],
  };

  if (payload.userId) {
    body.user_id = payload.userId;
  }

  if (payload.timestamp instanceof Date) {
    body.timestamp_micros = Math.floor(payload.timestamp.getTime() * 1000);
  }

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        measurementId
      )}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(
        'Failed to forward analytics event to Google Analytics Measurement Protocol',
        error
      );
    }
  }
};

export const trackEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      eventName,
      properties,
      userId: bodyUserId,
      sessionId,
      page,
      referrer,
      userAgent,
      timestamp,
      ipAddress: ipFromBody,
    } = req.body ?? {};

    if (!eventName || typeof eventName !== 'string') {
      throw new AppError('Event name is required', 400);
    }

    const resolvedUserId =
      typeof bodyUserId === 'string' && bodyUserId.length > 0
        ? bodyUserId
        : req.user?.id;

    const { stringified, object: propertiesObject } =
      normalizeProperties(properties);

    let eventTimestamp: Date | undefined;
    if (timestamp) {
      const parsedTimestamp = new Date(timestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) {
        throw new AppError('Invalid event timestamp provided', 400);
      }
      eventTimestamp = parsedTimestamp;
    }

    const resolvedUserAgent =
      typeof userAgent === 'string' && userAgent.length > 0
        ? userAgent
        : Array.isArray(req.headers['user-agent'])
        ? req.headers['user-agent'][0]
        : typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;

    const ipAddress = extractIpAddress(req, ipFromBody);

    const analyticsEvent = await prisma.analyticsEvent.create({
      data: {
        eventName,
        userId: resolvedUserId,
        sessionId,
        properties: stringified,
        page,
        referrer,
        userAgent: resolvedUserAgent,
        ipAddress,
        ...(eventTimestamp ? { createdAt: eventTimestamp } : {}),
      },
    });

    void forwardEventToMeasurementProtocol({
      eventName,
      userId: resolvedUserId || undefined,
      sessionId,
      properties: propertiesObject,
      ipAddress,
      page,
      timestamp: analyticsEvent.createdAt,
    });

    res.status(201).json({
      success: true,
      event: {
        ...analyticsEvent,
        properties: propertiesObject,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const startDateParam = parseDateFromQuery(req.query.startDate);
    const endDateParam = parseDateFromQuery(req.query.endDate);
    const { startDate, endDate } = normalizeDateRange(
      startDateParam,
      endDateParam
    );

    const eventNames = [
      ...toStringArrayParam(req.query.eventNames),
      ...toStringArrayParam(req.query.eventName),
    ];
    const userId = toStringParam(req.query.userId);
    const sessionId = toStringParam(req.query.sessionId);
    const pageFilter = toStringParam(req.query.page);
    const referrerFilter = toStringParam(req.query.referrer);
    const searchTerm = toStringParam(req.query.search);
    const limit = Math.max(
      1,
      Math.min(toNumberParam(req.query.limit, 10), MAX_SUMMARY_LIMIT)
    );

    const where = buildAnalyticsWhere({
      startDate,
      endDate,
      eventNames: eventNames.length ? eventNames : undefined,
      userId: userId ?? undefined,
      sessionId: sessionId ?? undefined,
      page: pageFilter ?? undefined,
      referrer: referrerFilter ?? undefined,
      searchTerm: searchTerm ?? undefined,
    });

    const totalEventsPromise = prisma.analyticsEvent.count({ where });

    const uniqueUsersPromise = prisma.analyticsEvent.findMany({
      where:
        where.userId === undefined
          ? {
              ...where,
              userId: { not: null },
            }
          : where,
      distinct: ['userId'],
      select: { userId: true },
    });

    const eventGroupPromise = prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      _count: { _all: true },
      where,
    });

    const topPagesWhere: Prisma.AnalyticsEventWhereInput =
      where.page === undefined
        ? {
            ...where,
            page: { not: null },
          }
        : where;

    const pageGroupPromise = prisma.analyticsEvent.groupBy({
      by: ['page'],
      _count: { _all: true },
      where: topPagesWhere,
    });

    const timelineEventsPromise = prisma.analyticsEvent.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const [totalEvents, uniqueUsersRaw, eventGroups, pageGroups, timelineEvents] =
      await Promise.all([
        totalEventsPromise,
        uniqueUsersPromise,
        eventGroupPromise,
        pageGroupPromise,
        timelineEventsPromise,
      ]);

    const uniqueUsers = uniqueUsersRaw.filter(
      (entry) => entry.userId !== null
    ).length;

    const eventsByName = eventGroups
      .map((group) => ({
        eventName: group.eventName,
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const topPages = pageGroups
      .filter((group) => group.page !== null)
      .map((group) => ({
        page: group.page as string,
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const timelineMap = new Map<string, number>();
    timelineEvents.forEach((event) => {
      const key = formatISODate(event.createdAt);
      timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1);
    });

    const dailyEventCounts: Array<{ date: string; count: number }> = [];
    const cursor = new Date(startDate);
    const endDay = new Date(endDate);
    cursor.setHours(0, 0, 0, 0);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = formatISODate(cursor);
      dailyEventCounts.push({
        date: key,
        count: timelineMap.get(key) ?? 0,
      });
      cursor.setTime(cursor.getTime() + MS_PER_DAY);
    }

    res.json({
      range: {
        startDate: formatISODate(startDate),
        endDate: formatISODate(endDate),
      },
      totalEvents,
      uniqueUsers,
      averageEventsPerUser:
        uniqueUsers > 0 ? totalEvents / uniqueUsers : 0,
      eventsByName,
      topPages,
      dailyEventCounts,
    });
  } catch (error) {
    next(error);
  }
};

const mapReportRows = (
  response: protos.google.analytics.data.v1beta.IRunReportResponse
): {
  dimensionHeaders: string[];
  metricHeaders: string[];
  rows: Array<{ dimensions: Record<string, string | null>; metrics: Record<string, number> }>;
  totals: Record<string, number>;
  metadata: {
    rowCount: number;
    currencyCode: string | null;
    timeZone: string | null;
    dataLossFromOtherRow: boolean | null;
    emptyReason: string | null;
  };
} => {
  const dimensionHeaders =
    response.dimensionHeaders?.map((header) => header.name ?? '') ?? [];
  const metricHeaders =
    response.metricHeaders?.map((header) => header.name ?? '') ?? [];

  const rows =
    response.rows?.map((row) => {
      const dimensions: Record<string, string | null> = {};
      const metrics: Record<string, number> = {};

      dimensionHeaders.forEach((header, index) => {
        dimensions[header] = row.dimensionValues?.[index]?.value ?? null;
      });

      metricHeaders.forEach((header, index) => {
        const rawValue = row.metricValues?.[index]?.value ?? '0';
        const numericValue = Number(rawValue);
        metrics[header] = Number.isFinite(numericValue) ? numericValue : 0;
      });

      return { dimensions, metrics };
    }) ?? [];

  const totals: Record<string, number> = {};
  metricHeaders.forEach((header, index) => {
    const rawValue = response.totals?.[0]?.metricValues?.[index]?.value ?? '0';
    const numericValue = Number(rawValue);
    totals[header] = Number.isFinite(numericValue) ? numericValue : 0;
  });

  return {
    dimensionHeaders,
    metricHeaders,
    rows,
    totals,
    metadata: {
      rowCount: Number(response.rowCount ?? rows.length),
      currencyCode: response.metadata?.currencyCode ?? null,
      timeZone: response.metadata?.timeZone ?? null,
      dataLossFromOtherRow:
        typeof response.metadata?.dataLossFromOtherRow === 'boolean'
          ? response.metadata?.dataLossFromOtherRow
          : null,
      emptyReason: response.metadata?.emptyReason ?? null,
    },
  };
};

export const getGoogleAnalyticsData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log for debugging
    console.log('[GA] Fetching analytics data...');
    console.log('[GA] Property ID:', process.env.GOOGLE_ANALYTICS_PROPERTY_ID);
    console.log(
      '[GA] Credentials configured:',
      process.env.GOOGLE_ANALYTICS_CREDENTIALS_JSON
        ? 'inline JSON'
        : process.env.GOOGLE_ANALYTICS_CREDENTIALS_PATH
        ? `file: ${process.env.GOOGLE_ANALYTICS_CREDENTIALS_PATH}`
        : 'missing'
    );

    const { propertyId, credentialsPath, credentialsJson } = resolveGAConfig();

    console.log('[GA] Resolved property ID:', propertyId);
    console.log('[GA] Using credentials:', credentialsJson ? 'inline JSON' : `file: ${credentialsPath}`);

    const client = getGAClient();
    
    const startDateParam = parseDateFromQuery(req.query.startDate);
    const endDateParam = parseDateFromQuery(req.query.endDate);
    const { startDate, endDate } = normalizeDateRange(
      startDateParam,
      endDateParam
    );

    const type = toStringParam(req.query.type) || 'overview';
    const { propertyId: propertyIdFromConfig } = resolveGAConfig();
    const clientFromConfig = getGAClient();

    // Shape response based on type parameter
    if (type === 'overview') {
      // Fetch overview metrics: users, sessions, pageViews, bounce rate, session duration
      const [overviewResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
      });

      const overviewMapped = mapReportRows(overviewResponse);

      // Fetch daily trend data
      const [trendResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      const trendMapped = mapReportRows(trendResponse);
      const dailyTrend = trendMapped.rows.map((row) => ({
        date: row.dimensions.date || '',
        users: row.metrics.activeUsers || 0,
        sessions: row.metrics.sessions || 0,
      }));

      // Fetch top pages
      const [pagesResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'pagePath' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      });

      const pagesMapped = mapReportRows(pagesResponse);
      const topPages = pagesMapped.rows.map((row) => ({
        path: row.dimensions.pagePath || 'Unknown',
        views: row.metrics.screenPageViews || 0,
        avgTimeOnPage: row.metrics.averageSessionDuration || 0,
      }));

      res.json({
        totalUsers: overviewMapped.totals.activeUsers || 0,
        sessions: overviewMapped.totals.sessions || 0,
        pageViews: overviewMapped.totals.screenPageViews || 0,
        avgSessionDuration: overviewMapped.totals.averageSessionDuration || 0,
        bounceRate: (overviewMapped.totals.bounceRate || 0) * 100,
        dailyTrend,
        topPages,
      });
    } else if (type === 'engagement') {
      // Fetch engagement metrics
      const [engagementResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [
          { name: 'eventCount' },
          { name: 'sessions' },
          { name: 'engagedSessions' },
        ],
      });

      const engagementMapped = mapReportRows(engagementResponse);
      const totalEvents = engagementMapped.totals.eventCount || 0;
      const totalSessions = engagementMapped.totals.sessions || 1;
      const eventsPerSession = totalEvents / totalSessions;

      // Fetch events breakdown
      const [eventsResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'eventCount' }],
        dimensions: [{ name: 'eventName' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      });

      const eventsMapped = mapReportRows(eventsResponse);
      const eventsBreakdown = eventsMapped.rows.map((row) => ({
        name: row.dimensions.eventName || 'Unknown',
        count: row.metrics.eventCount || 0,
      }));

      // Fetch session duration buckets
      const [durationResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        limit: 10,
      });

      const durationMapped = mapReportRows(durationResponse);
      const sessionDurationBuckets = durationMapped.rows.map((row) => ({
        label: row.dimensions.sessionDefaultChannelGroup || 'Unknown',
        count: row.metrics.sessions || 0,
      }));

      res.json({
        eventsPerSession,
        engagedSessions: engagementMapped.totals.engagedSessions || 0,
        eventsBreakdown,
        sessionDurationBuckets,
      });
    } else if (type === 'traffic' || type === 'acquisition') {
      // Fetch traffic source data
      const [sourceResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionSource' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      });

      const sourceMapped = mapReportRows(sourceResponse);
      const bySource = sourceMapped.rows.map((row) => ({
        source: row.dimensions.sessionSource || 'Unknown',
        sessions: row.metrics.sessions || 0,
      }));

      // Fetch by medium
      const [mediumResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionMedium' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      });

      const mediumMapped = mapReportRows(mediumResponse);
      const byMedium = mediumMapped.rows.map((row) => ({
        medium: row.dimensions.sessionMedium || 'Unknown',
        sessions: row.metrics.sessions || 0,
      }));

      // Fetch by country
      const [countryResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'country' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      });

      const countryMapped = mapReportRows(countryResponse);
      const byCountry = countryMapped.rows.map((row) => ({
        country: row.dimensions.country || 'Unknown',
        sessions: row.metrics.sessions || 0,
      }));

      // Fetch campaigns
      const [campaignResponse] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionCampaignName' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      });

      const campaignMapped = mapReportRows(campaignResponse);
      const campaigns = campaignMapped.rows
        .filter((row) => row.dimensions.sessionCampaignName && row.dimensions.sessionCampaignName !== '(not set)')
        .map((row) => ({
          campaign: row.dimensions.sessionCampaignName || 'Unknown',
          sessions: row.metrics.sessions || 0,
        }));

      res.json({
        bySource,
        byMedium,
        byCountry,
        campaigns,
      });
    } else {
      // Fallback to generic response for custom queries
      const metricNames = toStringArrayParam(req.query.metrics);
      const dimensionNames = toStringArrayParam(req.query.dimensions);
      const limit = Math.max(
        1,
        Math.min(toNumberParam(req.query.limit, 1000), MAX_REPORT_LIMIT)
      );

      const metrics =
        metricNames.length > 0
          ? metricNames.map((name) => ({ name }))
          : [
              { name: 'activeUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
            ];

      const dimensions =
        dimensionNames.length > 0
          ? dimensionNames.map((name) => ({ name }))
          : [{ name: 'date' }];

      const [response] = await client.runReport({
        property: `properties/${propertyIdFromConfig}`,
        dateRanges: [
          {
            startDate: formatISODate(startDate),
            endDate: formatISODate(endDate),
          },
        ],
        metrics,
        dimensions,
        limit,
      });

      const mapped = mapReportRows(response);

      res.json({
        range: {
          startDate: formatISODate(startDate),
          endDate: formatISODate(endDate),
        },
        headers: {
          dimensions: mapped.dimensionHeaders,
          metrics: mapped.metricHeaders,
        },
        rows: mapped.rows,
        totals: mapped.totals,
        metadata: mapped.metadata,
      });
    }
  } catch (error) {
    console.error('[GA] Error fetching analytics:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Google Analytics data',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};

export const getRealtimeData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { propertyId } = resolveGAConfig();
    const client = getGAClient();

    // Fetch realtime active users
    const [usersResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    });

    const usersMapped = mapReportRows(usersResponse);
    const activeUsers = usersMapped.totals.activeUsers || 0;

    // Fetch realtime active pages by pagePath
    const [pagesResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'unifiedScreenName' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 25,
    });

    const pagesMapped = mapReportRows(pagesResponse);
    const activePages = pagesMapped.rows.map((row) => ({
      path:
        row.dimensions.unifiedScreenName ??
        row.dimensions.pagePath ??
        row.dimensions.pageTitle ??
        'Unknown',
      activeUsers: row.metrics.activeUsers ?? 0,
    }));

    // Fetch recent events (optional, for event stream)
    const [eventsResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'eventCount' }],
      dimensions: [{ name: 'eventName' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

    const eventsMapped = mapReportRows(eventsResponse);
    const events = eventsMapped.rows.map((row) => ({
      name: row.dimensions.eventName || 'Unknown',
      timestamp: new Date().toISOString(),
    }));

    res.json({
      activeUsers,
      activePages,
      topPages: activePages,
      events,
      totals: usersMapped.totals,
      metadata: {
        generatedAt: new Date().toISOString(),
        ...usersMapped.metadata,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Google Analytics Realtime API error', error);
    }
    next(new AppError('Failed to fetch Google Analytics realtime data', 502));
  }
};

export const getStoredEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, toNumberParam(req.query.page, 1));
    const pageSize = Math.max(
      1,
      Math.min(toNumberParam(req.query.pageSize, 25), 200)
    );
    const skip = (page - 1) * pageSize;

    const startDateParam = parseDateFromQuery(req.query.startDate);
    const endDateParam = parseDateFromQuery(req.query.endDate);
    const dateRange = startDateParam || endDateParam
      ? normalizeDateRange(startDateParam, endDateParam)
      : undefined;

    const eventNames = [
      ...toStringArrayParam(req.query.eventNames),
      ...toStringArrayParam(req.query.eventName),
    ];
    const userId = toStringParam(req.query.userId);
    const sessionId = toStringParam(req.query.sessionId);
    const pageFilter = toStringParam(req.query.page);
    const referrerFilter = toStringParam(req.query.referrer);
    const searchTerm = toStringParam(req.query.search);

    const where = buildAnalyticsWhere({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
      eventNames: eventNames.length ? eventNames : undefined,
      userId: userId ?? undefined,
      sessionId: sessionId ?? undefined,
      page: pageFilter ?? undefined,
      referrer: referrerFilter ?? undefined,
      searchTerm: searchTerm ?? undefined,
    });

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    const formattedEvents = events.map((event) => ({
      ...event,
      properties: safeJsonParse(event.properties),
    }));

    res.json({
      data: formattedEvents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        startDate: dateRange ? formatISODate(dateRange.startDate) : undefined,
        endDate: dateRange ? formatISODate(dateRange.endDate) : undefined,
        userId,
        sessionId,
        page: pageFilter,
        referrer: referrerFilter,
        eventNames: eventNames.length ? eventNames : undefined,
        search: searchTerm,
      },
    });
  } catch (error) {
    next(error);
  }
};
