import React, { Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';

import ErrorBoundary from './components/ErrorBoundary';
import * as Skeletons from './components/Skeletons';
import MainLayout from './components/MainLayout';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { DataProvider } from './contexts/DataContext';
import { CommandPaletteProvider } from './contexts/CommandPaletteContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeAnalytics } from './services/analyticsService';
import { GamificationProvider } from './contexts/GamificationContext';
import { LevelUpModal, NewBadgeModal } from './components/Gamification';

// Admin Imports
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const ToolsDirectoryPage = React.lazy(() => import('./pages/ToolsDirectoryPage'));
const ToolDetailPage = React.lazy(() => import('./pages/ToolDetailPage'));
const UtilitiesPage = React.lazy(() => import('./pages/UtilitiesPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const WorkflowVaultPage = React.lazy(() => import('./pages/WorkflowVaultPage'));
const ContentStudioPage = React.lazy(() => import('./pages/ContentStudioPage'));
const ForumPage = React.lazy(() => import('./pages/ForumPage'));
const ForumCategoryPage = React.lazy(() => import('./pages/ForumCategoryPage'));
const ForumThreadPage = React.lazy(() => import('./pages/ForumThreadPage'));
const NewsPage = React.lazy(() => import('./pages/NewsPage'));
const NewsArticlePage = React.lazy(() => import('./pages/NewsArticlePage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const BookCallPage = React.lazy(() => import('./pages/BookCallPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const LearnPage = React.lazy(() => import('./pages/LearnPage'));
const YouTubePage = React.lazy(() => import('./pages/YouTubePage'));

const TitlesHooksGenerator = React.lazy(() => import('./pages/utility/TitlesHooksGenerator'));
const YoutubeChaptersGenerator = React.lazy(() => import('./pages/utility/YoutubeChaptersGenerator'));
const CaptionFormatter = React.lazy(() => import('./pages/utility/CaptionFormatter'));
const ThumbnailPromptGenerator = React.lazy(() => import('./pages/utility/ThumbnailPromptGenerator'));
const VideoClipGenerator = React.lazy(() => import('./pages/utility/VideoClipGenerator'));
const ThumbnailTester = React.lazy(() => import('./pages/utility/ThumbnailTester'));
const VideoAudioTranscriber = React.lazy(() => import('./pages/utility/VideoAudioTranscriber'));
const ContentRepurposer = React.lazy(() => import('./pages/utility/ContentRepurposer'));
const AIImageEditor = React.lazy(() => import('./pages/utility/AIImageEditor'));
const ThumbnailGenerator = React.lazy(() => import('./pages/utility/ThumbnailGenerator'));
const PresentationCoach = React.lazy(() => import('./pages/utility/PresentationCoach'));

// New Utilities - Phase 2
const AIResumeBuilder = React.lazy(() => import('./pages/utility/AIResumeBuilder'));
const VoiceToBlog = React.lazy(() => import('./pages/utility/VoiceToBlog'));
const CSVDataVisualizer = React.lazy(() => import('./pages/utility/CSVDataVisualizer'));
const LinkedInPostOptimizer = React.lazy(() => import('./pages/utility/LinkedInPostOptimizer'));
const CodeDebugger = React.lazy(() => import('./pages/utility/CodeDebugger'));

// New Utilities - Phase 3 (High-Impact Additions)
const EmailResponseGenerator = React.lazy(() => import('./pages/utility/EmailResponseGenerator'));
const MeetingMinutesGenerator = React.lazy(() => import('./pages/utility/MeetingMinutesGenerator'));
const BusinessNameGenerator = React.lazy(() => import('./pages/utility/BusinessNameGenerator'));

const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminToolsPage = React.lazy(() => import('./pages/admin/AdminToolsPage'));
const AdminWorkflowsPage = React.lazy(() => import('./pages/admin/AdminWorkflowsPage'));
const AdminForumPage = React.lazy(() => import('./pages/admin/AdminForumPage'));
const AdminNewsPage = React.lazy(() => import('./pages/admin/AdminNewsPage'));
const AdminAnalyticsPage = React.lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminGoogleAnalyticsPage = React.lazy(() => import('./pages/admin/AdminGoogleAnalyticsPage'));

/**
 * Initialize Sentry only in production to capture errors, session replays, and trace data.
 * The app shell leverages React.lazy and Suspense to code-split all pages while ErrorBoundary wraps the tree.
 * This preserves development DX while providing production-grade monitoring safeguards.
 */
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const App: React.FC = () => {
  // Initialize Google Analytics on app mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <GamificationProvider>
            <ToastProvider>
              <HashRouter>
                <ScrollToTop />
                <CommandPaletteProvider>
                  <Suspense fallback={<Skeletons.PageSkeleton />}>
                    <Routes>
                      {/* Admin Section */}
                      <Route
                        path="/admin/*"
                        element={
                          <DataProvider>
                            <AdminRoute>
                              <AdminLayout>
                                <Routes>
                                  <Route path="dashboard" element={<AdminDashboardPage />} />
                                  {import.meta.env.VITE_ENABLE_ADMIN_ANALYTICS === 'true' && (
                                    <>
                                      <Route path="analytics" element={<AdminAnalyticsPage />} />
                                      <Route path="google-analytics" element={<AdminGoogleAnalyticsPage />} />
                                    </>
                                  )}
                                  <Route path="users" element={<AdminUsersPage />} />
                                  <Route path="tools" element={<AdminToolsPage />} />
                                  <Route path="workflows" element={<AdminWorkflowsPage />} />
                                  <Route path="forum" element={<AdminForumPage />} />
                                  <Route path="news" element={<AdminNewsPage />} />
                                  <Route path="*" element={<Navigate to="dashboard" />} />
                                </Routes>
                              </AdminLayout>
                            </AdminRoute>
                          </DataProvider>
                        }
                      />

                      {/* Public Section */}
                      <Route
                        path="/*"
                        element={
                          <DataProvider>
                            <Routes>
                              <Route element={<MainLayout />}>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/tools" element={<ToolsDirectoryPage />} />
                                <Route path="/tools/:slug" element={<ToolDetailPage />} />
                                <Route path="/utilities" element={<UtilitiesPage />} />
                                <Route path="/utilities/titles-hooks-generator" element={<TitlesHooksGenerator />} />
                                <Route path="/utilities/youtube-chapters-summary" element={<YoutubeChaptersGenerator />} />
                                <Route path="/utilities/captions-formatter" element={<CaptionFormatter />} />
                                <Route path="/utilities/thumbnail-prompt-generator" element={<ThumbnailPromptGenerator />} />
                                <Route path="/utilities/thumbnail-generator" element={<ThumbnailGenerator />} />
                                <Route path="/utilities/thumbnail-tester" element={<ThumbnailTester />} />
                                <Route path="/utilities/video-clip-generator" element={<VideoClipGenerator />} />
                                <Route path="/utilities/video-audio-transcriber" element={<VideoAudioTranscriber />} />
                                <Route path="/utilities/content-repurposer" element={<ContentRepurposer />} />
                                <Route path="/utilities/ai-image-editor" element={<AIImageEditor />} />
                                <Route
                                  path="/utilities/presentation-coach"
                                  element={<ProtectedRoute><PresentationCoach /></ProtectedRoute>}
                                />
                                <Route path="/utilities/ai-resume-builder" element={<AIResumeBuilder />} />
                                <Route path="/utilities/voice-to-blog" element={<VoiceToBlog />} />
                                <Route path="/utilities/csv-data-visualizer" element={<CSVDataVisualizer />} />
                                <Route path="/utilities/linkedin-post-optimizer" element={<LinkedInPostOptimizer />} />
                                <Route path="/utilities/code-debugger" element={<CodeDebugger />} />
                                <Route path="/utilities/email-response-generator" element={<EmailResponseGenerator />} />
                                <Route path="/utilities/meeting-minutes-generator" element={<MeetingMinutesGenerator />} />
                                <Route path="/utilities/business-name-generator" element={<BusinessNameGenerator />} />
                                <Route path="/workflows" element={<WorkflowVaultPage />} />
                                <Route path="/forum" element={<ForumPage />} />
                                <Route path="/forum/:categorySlug" element={<ForumCategoryPage />} />
                                <Route path="/forum/thread/:threadSlug" element={<ForumThreadPage />} />
                                <Route path="/news" element={<NewsPage />} />
                                <Route path="/news/:slug" element={<NewsArticlePage />} />
                                <Route path="/content-studio" element={<ContentStudioPage />} />
                                <Route path="/contact" element={<ContactPage />} />
                                <Route path="/book" element={<BookCallPage />} />
                                <Route path="/about" element={<AboutPage />} />
                                <Route path="/learn" element={<LearnPage />} />
                                <Route path="/youtube" element={<YouTubePage />} />
                                <Route
                                  path="/chat"
                                  element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
                                />
                                <Route
                                  path="/dashboard"
                                  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
                                />
                                <Route
                                  path="/analytics"
                                  element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>}
                                />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/signup" element={<SignupPage />} />
                                <Route path="*" element={<Navigate to="/" />} />
                              </Route>
                            </Routes>
                          </DataProvider>
                        }
                      />
                    </Routes>
                  </Suspense>
                </CommandPaletteProvider>
                <ToastContainer />
                <LevelUpModal />
                <NewBadgeModal />
              </HashRouter>
            </ToastProvider>
          </GamificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
