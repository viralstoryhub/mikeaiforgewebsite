import apiClient from './apiClient';
import { NewsArticle, PaginatedResponse } from '../types';

interface GetArticlesParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  sortBy?: string;
  timeframe?: string;
}

// Article input used for create/update operations
export type ArticleInput = {
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  category: string;
  tags?: string[];
  publishedAt?: string | Date;
  isFeatured?: boolean;
};

// Helper to extract data from the backend response format: { status: 'success', data: {...} }
const extractData = <T>(response: any): T => {
  if (response?.data?.data) {
    return response.data.data;
  }
  if (response?.data) {
    return response.data;
  }
  return response;
};

export const getArticles = async (
  params: GetArticlesParams = {}
): Promise<PaginatedResponse<NewsArticle> | NewsArticle[]> => {
  try {
    const response = await apiClient.get('/news', { params });
    return extractData(response);
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};

export const getFeaturedArticles = async (): Promise<NewsArticle[]> => {
  try {
    const response = await apiClient.get('/news/featured');
    return extractData(response);
  } catch (error) {
    console.error('Error fetching featured articles:', error);
    throw error;
  }
};

export const getArticleBySlug = async (
  slug: string
): Promise<NewsArticle | null> => {
  try {
    const response = await apiClient.get(`/news/${slug}`);
    return extractData(response);
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/news/categories');
    return extractData(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const createArticle = async (
  payload: ArticleInput
): Promise<NewsArticle> => {
  const response = await apiClient.post('/news', payload);
  return extractData(response);
};

export const updateArticle = async (
  articleId: string,
  updates: Partial<ArticleInput>
): Promise<NewsArticle> => {
  const response = await apiClient.patch(`/news/${articleId}`, updates);
  return extractData(response);
};

export const deleteArticle = async (articleId: string): Promise<void> => {
  await apiClient.delete(`/news/${articleId}`);
};

export const toggleFeatured = async (articleId: string): Promise<NewsArticle> => {
  const response = await apiClient.patch(`/news/${articleId}/featured`);
  return extractData(response);
};

export default {
  getArticles,
  getFeaturedArticles,
  getArticleBySlug,
  getCategories,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleFeatured,
};