import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { optimizeLinkedInPost } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'linkedin-post-optimizer';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

interface LinkedInOptimizationResult {
  originalScore: number;
  optimizedPost: string;
  optimizedScore: number;
  improvements: string[];
  hashtags: string[];
  callToAction: string;
  engagementTips: string[];
}

const LinkedInPostOptimizer: React.FC = () => {
  const [postContent, setPostContent] = useState('');
  const [goal, setGoal] = useState('engagement');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<LinkedInOptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { postContent: savedPost, goal: savedGoal } = JSON.parse(savedState);
        setPostContent(savedPost || '');
        setGoal(savedGoal || 'engagement');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ postContent, goal });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [postContent, goal]);

  const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
  const remainingUses = FREE_TIER_LIMIT - usage;
  const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
  const limitReached = isFreeTier && remainingUses <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (limitReached) {
      addToast("You have reached your free limit for this utility.", 'error');
      return;
    }
    
    if (!postContent.trim() || postContent.trim().length < 20) {
      setError('Please enter a LinkedIn post (at least 20 characters).');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResults(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await optimizeLinkedInPost(postContent, goal, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);
      addToast('Post optimization complete!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while optimizing your post. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">LinkedIn Post Optimizer</h1>
      </div>
      <p className="mb-6 text-light-secondary">Enter your LinkedIn post draft and get AI-powered optimization suggestions to maximize engagement.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label htmlFor="post_content" className="block text-sm font-medium text-light-secondary">Your LinkedIn Post</label>
          <textarea
            id="post_content"
            rows={8}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Paste your LinkedIn post draft here..."
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
          <div className="mt-1 text-xs text-gray-500 text-right">{postContent.length} / 3000 characters</div>
        </div>

        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-light-secondary">Post Goal</label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          >
            <option value="engagement">Maximize Engagement (likes, comments)</option>
            <option value="reach">Maximize Reach (shares, impressions)</option>
            <option value="leads">Generate Leads (profile views, connections)</option>
            <option value="thought-leadership">Establish Thought Leadership</option>
          </select>
        </div>

        <div>
          <PersonaSelector selectedPersonaId={selectedPersonaId} onChange={setSelectedPersonaId} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="pt-2">
          {isFreeTier && (
            <div className="text-sm text-center text-gray-500 mb-4">
              {limitReached ? (
                <p>
                  You've reached your free limit. 
                  <Link to="/dashboard" className="font-semibold text-brand-primary hover:underline ml-1">
                    Upgrade to Pro
                  </Link> 
                  {' '}for unlimited uses.
                </p>
              ) : (
                <p>
                  You have <strong>{remainingUses}</strong> of {FREE_TIER_LIMIT} free uses remaining.
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || limitReached}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Optimizing Post...' : 'Optimize Post'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-light-secondary">AI is analyzing your post...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-dark-secondary rounded-lg border border-border-dark text-center">
              <p className="text-sm text-light-secondary mb-1">Original Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(results.originalScore)}`}>
                {results.originalScore}/100
              </p>
            </div>
            <div className="p-4 bg-dark-secondary rounded-lg border border-border-dark text-center">
              <p className="text-sm text-light-secondary mb-1">Optimized Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(results.optimizedScore)}`}>
                {results.optimizedScore}/100
              </p>
              {results.optimizedScore > results.originalScore && (
                <p className="text-xs text-green-500 mt-1">
                  +{results.optimizedScore - results.originalScore} points improvement
                </p>
              )}
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-light-primary">Optimized Post</h2>
              <button
                onClick={() => handleCopyToClipboard(results.optimizedPost + '\n\n' + results.hashtags.join(' '))}
                className="px-3 py-1 bg-brand-primary text-white text-sm rounded-md hover:opacity-90"
              >
                Copy Post
              </button>
            </div>
            <div className="p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary whitespace-pre-wrap mb-4">{results.optimizedPost}</p>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border-dark">
                {results.hashtags.map((tag, index) => (
                  <span key={index} className="text-brand-primary text-sm">#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">What Changed?</h2>
            <ul className="space-y-2">
              {results.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-light-secondary">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Suggested Call-to-Action</h2>
            <div className="p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary">{results.callToAction}</p>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Engagement Tips</h2>
            <ul className="space-y-2">
              {results.engagementTips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-light-secondary">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInPostOptimizer;