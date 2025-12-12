import type { AxiosError } from 'axios';
import { apiClient } from './apiClient';

type ApiErrorResponse = {
  message?: string;
  error?: string;
  errors?: string[];
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'asc' | 'desc';
}

export interface GoogleAnalyticsQueryParams {
  startDate: string;
  endDate: string;
  metrics?: string[];
  dimensions?: string[];
  filters?: Record<string, string | number>;
  limit?: number;
  sort?: string;
}

export type AnalyticsReportFormat = 'csv' | 'pdf';

const extractResponseData = <T>(response: any): T => {
  if (!response) {
    throw new Error('Empty response received from server');
  }

  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  if (response?.data !== undefined) {
    return response.data as T;
  }

  return response as T;
};

const handleRequestError = (error: unknown, fallbackMessage: string): never => {
  console.error(fallbackMessage, error);

  const axiosError = error as AxiosError<ApiErrorResponse>;

  const messageFromResponse =
    axiosError?.response?.data?.message ||
    axiosError?.response?.data?.error ||
    (Array.isArray(axiosError?.response?.data?.errors)
      ? axiosError.response?.data?.errors.join(', ')
      : undefined);

  if (messageFromResponse) {
    throw new Error(messageFromResponse);
  }

  if (axiosError?.message) {
    throw new Error(axiosError.message);
  }

  if (error instanceof Error && error.message) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
};

const transformGoogleAnalyticsParams = (
  params?: GoogleAnalyticsQueryParams
): Record<string, string | number> | undefined => {
  if (!params) {
    return undefined;
  }

  const transformed: Record<string, string | number> = {
    startDate: params.startDate,
    endDate: params.endDate,
  };

  if (params.metrics?.length) {
    transformed.metrics = params.metrics.join(',');
  }

  if (params.dimensions?.length) {
    transformed.dimensions = params.dimensions.join(',');
  }

  if (params.filters) {
    transformed.filters = JSON.stringify(params.filters);
  }

  if (typeof params.limit === 'number') {
    transformed.limit = params.limit;
  }

  if (params.sort) {
    transformed.sort = params.sort;
  }

  return transformed;
};

const createReportFileName = (format: AnalyticsReportFormat, dateRange?: DateRange): string => {
  const extension = format === 'csv' ? 'csv' : 'pdf';

  if (dateRange?.startDate && dateRange?.endDate) {
    const sanitizedStart = dateRange.startDate.replace(/[:\s]/g, '-');
    const sanitizedEnd = dateRange.endDate.replace(/[:\s]/g, '-');
    return `analytics-report_${sanitizedStart}_to_${sanitizedEnd}.${extension}`;
  }

  const today = new Date().toISOString().split('T')[0];
  return `analytics-report_${today}.${extension}`;
};

export const getDashboardStats = async <T = any>(): Promise<T> => {
  try {
    const response = await apiClient.get('/api/admin/stats');
    return extractResponseData<T>(response);
  } catch (error) {
    handleRequestError(error, 'Failed to fetch dashboard statistics');
  }
};

export const getAuditLogs = async <T = any>(params?: AuditLogQueryParams): Promise<T> => {
  try {
    const response = await apiClient.get('/api/admin/audit-logs', { params });
    return extractResponseData<T>(response);
  } catch (error) {
    handleRequestError(error, 'Failed to fetch audit logs');
  }
};

export const getSystemHealth = async <T = any>(): Promise<T> => {
  try {
    const response = await apiClient.get('/api/admin/system-health');
    return extractResponseData<T>(response);
  } catch (error) {
    handleRequestError(error, 'Failed to fetch system health data');
  }
};

export const getGoogleAnalyticsData = async <T = any>(
  params: GoogleAnalyticsQueryParams
): Promise<T> => {
  try {
    const response = await apiClient.get('/api/analytics/google-analytics', {
      params: transformGoogleAnalyticsParams(params),
    });
    return extractResponseData<T>(response);
  } catch (error) {
    handleRequestError(error, 'Failed to fetch Google Analytics data');
  }
};

export const getRealtimeAnalytics = async <T = any>(): Promise<T> => {
  try {
    const response = await apiClient.get('/api/analytics/google-analytics/realtime');
    return extractResponseData<T>(response);
  } catch (error) {
    handleRequestError(error, 'Failed to fetch real-time analytics');
  }
};

export const exportAnalyticsReport = async (
  format: AnalyticsReportFormat,
  dateRange?: DateRange
): Promise<string | Blob | void> => {
  const validFormats: AnalyticsReportFormat[] = ['csv', 'pdf'];
  if (!validFormats.includes(format)) {
    throw new Error(`Unsupported export format: ${format}`);
  }

  try {
    const params: Record<string, string> = { format };
    if (dateRange?.startDate) {
      params.startDate = dateRange.startDate;
    }
    if (dateRange?.endDate) {
      params.endDate = dateRange.endDate;
    }

    const response = await apiClient.get('/api/analytics/google-analytics/export', {
      params,
      responseType: 'blob',
    });

    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/pdf';
    const blob = new Blob([response.data], { type: mimeType });
    const fileName = createReportFileName(format, dateRange);

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return blob;
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return fileName;
  } catch (error) {
    handleRequestError(error, 'Failed to export analytics report');
  }
};
