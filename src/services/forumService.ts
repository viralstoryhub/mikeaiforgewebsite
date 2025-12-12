import axios, { type AxiosResponse } from 'axios';
import { apiClient } from './apiClient';
import type { ForumCategory, ForumThread, ForumPost, PaginationParams } from '../types';

interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

const unwrapResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  return response.data.data;
};

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string; error?: string } | undefined;
    const message =
      responseData?.message ||
      responseData?.error ||
      error.response?.statusText ||
      error.message ||
      'An unexpected error occurred';
    throw new Error(message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unexpected error occurred');
};

export type ThreadSortOption = 'latest' | 'mostViewed' | 'newest' | 'mostReplies';

export interface CategoryThreadsResponse {
  category: ForumCategory;
  threads: ForumThread[];
  pinnedThreads?: ForumThread[];
  pagination: PaginationParams;
  stats?: {
    totalThreads: number;
    totalPosts: number;
  };
}

export interface ThreadDetailResponse {
  thread: ForumThread;
  posts: ForumPost[];
  category?: ForumCategory;
  pagination: PaginationParams;
  relatedThreads?: ForumThread[];
}

export interface CreateThreadPayload {
  title: string;
  content: string;
}

export interface UpdateThreadPayload {
  title?: string;
  content?: string;
}

// Admin functions interfaces
export interface AdminThreadQuery {
  categorySlug?: string;
  status?: 'pinned' | 'locked';
  search?: string;
  limit?: number;
}

export interface AdminThreadsResponse {
  threads: ForumThread[];
  total?: number;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export const getCategories = async (): Promise<ForumCategory[]> => {
  try {
    const response = await apiClient.get<ApiResponse<ForumCategory[]>>('/forum/categories');
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getThreadsByCategory = async (
  categorySlug: string,
  page = 1,
  limit = 20,
  sortBy?: ThreadSortOption
): Promise<CategoryThreadsResponse> => {
  try {
    const params: Record<string, string | number> = { page, limit };
    if (sortBy) {
      params.sortBy = sortBy;
    }

    const response = await apiClient.get<ApiResponse<CategoryThreadsResponse>>(
      `/forum/categories/${categorySlug}/threads`,
      { params }
    );

    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getThreadBySlug = async (
  threadSlug: string,
  page = 1,
  limit = 20
): Promise<ThreadDetailResponse> => {
  try {
    const params: Record<string, number> = { page, limit };
    const response = await apiClient.get<ApiResponse<ThreadDetailResponse>>(
      `/forum/threads/${threadSlug}`,
      { params }
    );
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const createThread = async (
  categorySlug: string,
  data: CreateThreadPayload
): Promise<ForumThread> => {
  try {
    const response = await apiClient.post<ApiResponse<ForumThread>>('/forum/threads', {
      categorySlug,
      ...data,
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateThread = async (
  threadId: string,
  data: UpdateThreadPayload
): Promise<ForumThread> => {
  try {
    const response = await apiClient.patch<ApiResponse<ForumThread>>(`/forum/threads/${threadId}`, data);
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteThread = async (threadId: string): Promise<void> => {
  try {
    await apiClient.delete(`/forum/threads/${threadId}`);
  } catch (error) {
    handleApiError(error);
  }
};

export const createPost = async (threadId: string, content: string): Promise<ForumPost> => {
  try {
    const response = await apiClient.post<ApiResponse<ForumPost>>(`/forum/threads/${threadId}/posts`, {
      content,
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePost = async (postId: string, content: string): Promise<ForumPost> => {
  try {
    const response = await apiClient.patch<ApiResponse<ForumPost>>(`/forum/posts/${postId}`, {
      content,
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    await apiClient.delete(`/forum/posts/${postId}`);
  } catch (error) {
    handleApiError(error);
  }
};

export const togglePinThread = async (threadId: string, value?: boolean): Promise<ForumThread> => {
  try {
    const response = await apiClient.patch<ApiResponse<ForumThread>>(`/forum/threads/${threadId}/pin`, {
      isPinned: value
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const toggleLockThread = async (threadId: string, value?: boolean): Promise<ForumThread> => {
  try {
    const response = await apiClient.patch<ApiResponse<ForumThread>>(`/forum/threads/${threadId}/lock`, {
      isLocked: value
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

// Admin functions
export const getAdminThreads = async (
  params?: AdminThreadQuery
): Promise<AdminThreadsResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<AdminThreadsResponse>>('/forum/admin/threads', {
      params
    });
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const createCategory = async (payload: CategoryPayload): Promise<ForumCategory> => {
  try {
    const response = await apiClient.post<ApiResponse<ForumCategory>>('/forum/admin/categories', payload);
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateCategory = async (
  id: string,
  payload: Partial<CategoryPayload>
): Promise<ForumCategory> => {
  try {
    const response = await apiClient.patch<ApiResponse<ForumCategory>>(`/forum/admin/categories/${id}`, payload);
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/forum/admin/categories/${id}`);
  } catch (error) {
    handleApiError(error);
  }
};

export const bulkUpdateThreads = async (
  ids: string[],
  payload: Partial<ForumThread>
): Promise<void> => {
  try {
    await apiClient.patch('/forum/admin/threads/bulk', { ids, ...payload });
  } catch (error) {
    handleApiError(error);
  }
};

export const getFlaggedPosts = async (): Promise<ForumPost[]> => {
  try {
    const response = await apiClient.get<ApiResponse<ForumPost[]>>('/forum/admin/flagged-posts');
    return unwrapResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

export const forumService = {
  getCategories,
  getThreadsByCategory,
  getThreadBySlug,
  createThread,
  updateThread,
  deleteThread,
  createPost,
  updatePost,
  deletePost,
  togglePinThread,
  toggleLockThread,
  // Admin functions
  getAdminThreads,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateThreads,
  getFlaggedPosts,
};

export default forumService;
