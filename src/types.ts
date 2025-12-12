export interface Tool {
  id: string;
  slug: string;
  name: string;
  summary: string;
  websiteUrl: string;
  logoUrl: string;
  pricingModel: 'Freemium' | 'Paid' | 'Free' | 'Usage-based';
  freeTier: boolean;
  rating: number;
  verdict: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  quickstart: string[];
  categories: string[];
  tags: string[];
  affiliateLinkId?: string;
  youtubeReviewId?: string;
}

export interface Utility {
  id: string;
  slug: string;
  name: string;
  description: string;
  path: string;
  icon: string;
  category?: string;
  subcategory?: string;
  badge?: 'NEW' | 'POPULAR' | 'PRO' | 'BETA';
  estimatedTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  steps?: string[];
  useCases?: string[];
}

export interface UtilityCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  category: string;
  subcategory?: string;
  parentCategory?: string;
  subcategories?: UtilityCategory[];
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  threadCount: number;
  postCount: number;
  displayOrder?: number;
}

export interface ForumThread {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  content: string;
  authorId: string;
  author?: User;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  publishedAt: string;
  createdAt: string;
  isFeatured: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Workflow {
  id: string;
  slug: string;
  name: string;
  description: string;
  services: string[];
  icon: string;
  deploymentUrl?: string;
}


export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
}

export interface AIPersona {
  id: string;
  name: string;
  description: string;
}

export interface User {
  id:string;
  email: string;
  name?: string;
  bio?: string;
  profilePictureUrl?: string;
  savedTools?: string[];
  utilityUsage?: { [slug: string]: number };
  subscriptionTier: 'Free' | 'Pro';
  role: 'User' | 'Admin';
  personas?: AIPersona[];
  createdAt?: string;
  paymentMethod?: {
    last4: string;
    brand: string;
  };
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export interface RepurposedContent {
  summary: string;
  keyTakeaways: string[];
  socialPosts: {
    platform: 'LinkedIn' | 'Twitter';
    content: string;
  }[];
}

export interface PresentationFeedback {
  overallScore: number;
  feedback: {
    clarity: string;
    pacing: string;
    fillerWords: string;
    engagement: string;
  };
  suggestions: string[];
  fillerWordCount: { word: string; count: number }[];
}
